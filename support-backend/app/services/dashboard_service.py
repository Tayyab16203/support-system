"""Dashboard and analytics service."""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from app.core.logging import get_logger
from app.db.repositories.activity_repo import ActivityRepo
from app.db.repositories.project_repo import ProjectRepo
from app.db.repositories.ticket_repo import TicketRepo
from app.schemas.ticket import Priority, TicketStatus, TicketType

logger = get_logger(__name__)

# Default look-back window for the public dashboard when no range is supplied.
_DEFAULT_RANGE_DAYS = 30

# Canonical enum orderings so the response is stable and always includes every
# bucket (even ones with a zero count) for consistent chart rendering.
_STATUSES = [s.value for s in TicketStatus]
_TYPES = [t.value for t in TicketType]
_PRIORITIES = [p.value for p in Priority]


class DashboardService:
    """Business logic for dashboard metrics and insights.

    The public dashboard is intentionally scoped to *public* projects only
    (``projects.is_public = true``). All aggregation is performed in Python
    over a lightweight ticket projection because PostgREST offers no native
    ``GROUP BY``; ticket volumes on the public dashboard are small enough that
    a single fetch + in-memory grouping is simpler and fast enough.
    """

    def __init__(self) -> None:
        self.ticket_repo = TicketRepo()
        self.project_repo = ProjectRepo()
        self.activity_repo = ActivityRepo()

    async def get_public_metrics(
        self,
        project_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> dict[str, Any]:
        """Get public KPI metrics scoped to public projects.

        Args:
            project_id: Optional project filter. Must be a *public* project;
                a non-public or unknown id yields empty metrics.
            date_from: Start date (inclusive). Defaults to 30 days ago.
            date_to: End date (inclusive). Defaults to today.

        Returns:
            Dict with ``summary``, ``by_type``, ``by_priority``, ``over_time``
            and ``by_project`` matching the public dashboard API contract.
        """
        start, end = self._resolve_range(date_from, date_to)

        public_projects = await self.project_repo.list_public()
        public_by_id = {str(p["id"]): p for p in public_projects}

        # Determine which projects are in scope.
        if project_id is not None:
            if str(project_id) not in public_by_id:
                # Requested project is not public (or does not exist): return an
                # empty-but-well-formed payload rather than leaking private data.
                return self._empty_metrics()
            scoped_ids = [project_id]
        else:
            scoped_ids = [UUID(pid) for pid in public_by_id]

        tickets = await self.ticket_repo.fetch_for_aggregation(
            project_ids=scoped_ids,
            date_from=self._start_of_day_iso(start),
            date_to=self._end_of_day_iso(end),
        )

        result = {
            "summary": self._build_summary(tickets),
            "by_type": self._count_by_field(tickets, "type", _TYPES, "type"),
            "by_priority": self._count_by_field(
                tickets, "priority", _PRIORITIES, "priority"
            ),
            "over_time": self._build_over_time(tickets, start, end),
            "by_project": self._build_by_project(tickets, public_by_id),
        }

        logger.info(
            "public_dashboard_computed",
            extra={
                "context": {
                    "projects": len(scoped_ids),
                    "tickets": len(tickets),
                    "date_from": start.isoformat(),
                    "date_to": end.isoformat(),
                }
            },
        )
        return result

    async def get_insights(
        self,
        user_id: UUID,
        project_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> dict[str, Any]:
        """Get personal analytics for the authenticated user.

        The protected dashboard is intentionally *personal*: every metric is
        scoped to the requesting user, so each person only ever sees their own
        activity (tickets they created, tickets assigned to them, and how many
        they completed). Overall/team-wide numbers live on the public
        dashboard instead. Computes:

        * ``summary`` — headline counts for the user: created, assigned,
          completed, still-open assigned work, and their completion rate +
          average resolution time.
        * ``velocity`` — the user's created/completed counts for the current
          window vs. the preceding window of equal length, with percentage
          trend.
        * ``avg_time_per_status`` — average hours the user's *created* tickets
          dwell in each status, from ``status_changed`` history.
        * ``busiest_days`` — average tickets the user created per weekday.
        * ``top_types`` — type distribution of the user's created tickets.

        Args:
            user_id: The authenticated user the metrics are scoped to.
            project_id: Optional single-project filter (any project).
            date_from: Start date (inclusive). Defaults to 30 days ago.
            date_to: End date (inclusive). Defaults to today.

        Returns:
            Dict matching the personal insights API contract.
        """
        start, end = self._resolve_range(date_from, date_to)
        scoped_ids = [project_id] if project_id is not None else None

        current = await self.ticket_repo.fetch_for_aggregation(
            project_ids=scoped_ids,
            date_from=self._start_of_day_iso(start),
            date_to=self._end_of_day_iso(end),
            involving_user_id=user_id,
        )

        # Previous window of equal length, immediately preceding the current one.
        span_days = (end - start).days
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=span_days)
        previous = await self.ticket_repo.fetch_for_aggregation(
            project_ids=scoped_ids,
            date_from=self._start_of_day_iso(prev_start),
            date_to=self._end_of_day_iso(prev_end),
            involving_user_id=user_id,
        )

        uid = str(user_id)
        # Split into the two personal lenses. "Created by me" drives the
        # type/timing/weekday breakdowns (a person's own reports); "assigned to
        # me" drives completion stats (the work on my plate).
        created_by_me = [t for t in current if str(t.get("created_by")) == uid]
        assigned_to_me = [t for t in current if str(t.get("assigned_to")) == uid]

        ticket_ids = [UUID(str(t["id"])) for t in created_by_me if t.get("id")]
        status_changes = await self.activity_repo.fetch_status_changes(ticket_ids)

        result = {
            "summary": self._build_personal_summary(
                created_by_me, assigned_to_me
            ),
            "velocity": self._build_personal_velocity(
                current, previous, uid
            ),
            "avg_time_per_status": self._build_avg_time_per_status(
                created_by_me, status_changes
            ),
            "busiest_days": self._build_busiest_days(created_by_me, start, end),
            "top_types": self._build_top_types(created_by_me),
        }

        logger.info(
            "insights_computed",
            extra={
                "context": {
                    "user_id": uid,
                    "project_id": str(project_id) if project_id else None,
                    "created": len(created_by_me),
                    "assigned": len(assigned_to_me),
                    "date_from": start.isoformat(),
                    "date_to": end.isoformat(),
                }
            },
        )
        return result

    # ------------------------------------------------------------------
    # Insights aggregation helpers
    # ------------------------------------------------------------------

    def _build_personal_summary(
        self, created_by_me: list[dict], assigned_to_me: list[dict]
    ) -> dict[str, Any]:
        """Headline personal counts: created, assigned, completed, and rate.

        ``completed`` counts tickets *assigned to the user* that reached the
        completed status (work they finished). ``open_assigned`` is the rest of
        their assigned queue. ``avg_resolution_hours`` is measured over the
        user's completed assigned tickets.
        """
        completed_assigned = [
            t
            for t in assigned_to_me
            if t.get("status") == TicketStatus.COMPLETED.value
        ]
        assigned_count = len(assigned_to_me)
        completed_count = len(completed_assigned)

        resolution_hours = [
            h
            for t in completed_assigned
            if (h := self._resolution_hours(t)) is not None
        ]
        avg_resolution = (
            round(sum(resolution_hours) / len(resolution_hours), 1)
            if resolution_hours
            else 0.0
        )
        completion_rate = (
            round(completed_count / assigned_count * 100, 1)
            if assigned_count
            else 0.0
        )

        return {
            "created": len(created_by_me),
            "assigned": assigned_count,
            "completed": completed_count,
            "open_assigned": assigned_count - completed_count,
            "completion_rate": completion_rate,
            "avg_resolution_hours": avg_resolution,
        }

    def _build_personal_velocity(
        self, current: list[dict], previous: list[dict], uid: str
    ) -> dict[str, Any]:
        """The user's created vs completed volume, current window vs prior.

        ``created`` counts tickets the user opened; ``completed`` counts
        tickets assigned to the user that reached the completed status. Both
        windows are computed from the pre-fetched ticket lists.
        """

        def created(rows: list[dict]) -> int:
            return sum(1 for t in rows if str(t.get("created_by")) == uid)

        def completed(rows: list[dict]) -> int:
            return sum(
                1
                for t in rows
                if str(t.get("assigned_to")) == uid
                and t.get("status") == TicketStatus.COMPLETED.value
            )

        cur_created, cur_completed = created(current), completed(current)
        prev_created, prev_completed = created(previous), completed(previous)

        return {
            "current_period": {
                "created": cur_created,
                "completed": cur_completed,
            },
            "previous_period": {
                "created": prev_created,
                "completed": prev_completed,
            },
            "trend": {
                "created_change": self._percent_change(prev_created, cur_created),
                "completed_change": self._percent_change(
                    prev_completed, cur_completed
                ),
            },
        }

    def _build_avg_time_per_status(
        self, tickets: list[dict], status_changes: list[dict]
    ) -> dict[str, float]:
        """Average hours tickets dwell in each status.

        Walks each ticket's ordered status transitions and measures the elapsed
        time between the moment a status was entered and the next transition.
        A ticket enters ``pending`` at creation, so the first gap is measured
        from ``created_at`` to the first transition. The terminal status a
        ticket currently sits in has no closing transition and is not counted
        (its dwell time is still open-ended).
        """
        created_at_by_id = {
            str(t["id"]): self._parse_dt(t.get("created_at"))
            for t in tickets
            if t.get("id")
        }
        changes_by_ticket: dict[str, list[dict]] = defaultdict(list)
        for change in status_changes:
            changes_by_ticket[str(change.get("ticket_id"))].append(change)

        totals: dict[str, float] = {status: 0.0 for status in _STATUSES}
        counts: dict[str, int] = {status: 0 for status in _STATUSES}

        for ticket_id, changes in changes_by_ticket.items():
            # `entered_at` tracks when the current status began; the status a
            # ticket starts in is the `old_value` of its first transition.
            entered_at = created_at_by_id.get(ticket_id)
            first_status = self._status_of(changes[0].get("old_value"))
            current_status = first_status

            for change in changes:
                changed_at = self._parse_dt(change.get("created_at"))
                if entered_at and changed_at and current_status in totals:
                    hours = (changed_at - entered_at).total_seconds() / 3600
                    if hours >= 0:
                        totals[current_status] += hours
                        counts[current_status] += 1
                current_status = self._status_of(change.get("new_value"))
                entered_at = changed_at

        return {
            status: round(totals[status] / counts[status], 1)
            for status in _STATUSES
            if counts[status] > 0
        }

    def _build_busiest_days(
        self, tickets: list[dict], start: date, end: date
    ) -> list[dict]:
        """Average tickets created per weekday across the range.

        Divides the total created on each weekday by how many times that
        weekday occurs in the window, so a longer range does not inflate the
        average. Returned in Monday-first weekday order.
        """
        weekday_names = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        created_totals = [0] * 7
        for ticket in tickets:
            created = self._parse_dt(ticket.get("created_at"))
            if created:
                created_totals[created.weekday()] += 1

        weekday_occurrences = [0] * 7
        cursor = start
        while cursor <= end:
            weekday_occurrences[cursor.weekday()] += 1
            cursor += timedelta(days=1)

        rows: list[dict] = []
        for idx, name in enumerate(weekday_names):
            occurrences = weekday_occurrences[idx]
            avg = (
                round(created_totals[idx] / occurrences, 1) if occurrences else 0.0
            )
            rows.append({"day": name, "avg_created": avg})
        return rows

    @staticmethod
    def _build_top_types(tickets: list[dict]) -> list[dict]:
        """Ticket type distribution with share percentages, busiest first."""
        total = len(tickets)
        counts: dict[str, int] = {value: 0 for value in _TYPES}
        for ticket in tickets:
            value = ticket.get("type")
            if value in counts:
                counts[value] += 1

        rows = [
            {
                "type": value,
                "count": counts[value],
                "percentage": (
                    round(counts[value] / total * 100, 1) if total else 0.0
                ),
            }
            for value in _TYPES
        ]
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    @staticmethod
    def _percent_change(previous: int, current: int) -> float:
        """Percentage change from previous to current, rounded to one decimal.

        When the previous value is zero, returns 100.0 if there is any current
        activity (growth from nothing) or 0.0 when both are zero, avoiding a
        divide-by-zero while keeping the trend meaningful.
        """
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round((current - previous) / previous * 100, 1)

    @staticmethod
    def _status_of(value: Any) -> Optional[str]:
        """Extract a status string from an activity old/new_value payload."""
        if isinstance(value, dict):
            return value.get("status")
        return None

    # ------------------------------------------------------------------
    # Aggregation helpers
    # ------------------------------------------------------------------

    def _build_summary(self, tickets: list[dict]) -> dict[str, Any]:
        """Build the KPI summary block (status counts + avg resolution time)."""
        status_counts: dict[str, int] = {status: 0 for status in _STATUSES}
        resolution_hours: list[float] = []

        for ticket in tickets:
            status = ticket.get("status")
            if status in status_counts:
                status_counts[status] += 1
            if status == TicketStatus.COMPLETED.value:
                hours = self._resolution_hours(ticket)
                if hours is not None:
                    resolution_hours.append(hours)

        avg_resolution = (
            round(sum(resolution_hours) / len(resolution_hours), 1)
            if resolution_hours
            else 0.0
        )

        return {
            "total_tickets": len(tickets),
            "pending": status_counts[TicketStatus.PENDING.value],
            "in_progress": status_counts[TicketStatus.IN_PROGRESS.value],
            "paused": status_counts[TicketStatus.PAUSED.value],
            "in_review": status_counts[TicketStatus.IN_REVIEW.value],
            "completed": status_counts[TicketStatus.COMPLETED.value],
            "avg_resolution_hours": avg_resolution,
        }

    @staticmethod
    def _count_by_field(
        tickets: list[dict], field: str, order: list[str], label: str
    ) -> list[dict]:
        """Count tickets grouped by a field, preserving canonical ordering.

        Args:
            tickets: Ticket rows.
            field: The dict key to group by (e.g. "type").
            order: Canonical value order; every value appears in the output.
            label: The output key name for the value (e.g. "type").

        Returns:
            List of ``{<label>: value, "count": n}`` in canonical order.
        """
        counts: dict[str, int] = {value: 0 for value in order}
        for ticket in tickets:
            value = ticket.get(field)
            if value in counts:
                counts[value] += 1
        return [{label: value, "count": counts[value]} for value in order]

    def _build_over_time(
        self, tickets: list[dict], start: date, end: date
    ) -> list[dict]:
        """Build a per-day created/completed time series across the range.

        Created is bucketed by ``created_at``; completed is bucketed by
        ``updated_at`` for tickets currently in the completed status (the
        schema has no dedicated ``completed_at`` column, so the last update of
        a completed ticket is used as the resolution timestamp).
        """
        created_by_day: dict[str, int] = defaultdict(int)
        completed_by_day: dict[str, int] = defaultdict(int)

        for ticket in tickets:
            created = self._parse_dt(ticket.get("created_at"))
            if created:
                created_by_day[created.date().isoformat()] += 1
            if ticket.get("status") == TicketStatus.COMPLETED.value:
                updated = self._parse_dt(ticket.get("updated_at"))
                if updated:
                    completed_by_day[updated.date().isoformat()] += 1

        series: list[dict] = []
        cursor = start
        while cursor <= end:
            key = cursor.isoformat()
            series.append(
                {
                    "date": key,
                    "created": created_by_day.get(key, 0),
                    "completed": completed_by_day.get(key, 0),
                }
            )
            cursor += timedelta(days=1)
        return series

    @staticmethod
    def _build_by_project(
        tickets: list[dict], public_by_id: dict[str, dict]
    ) -> list[dict]:
        """Build per-project totals (total + completed) for public projects."""
        totals: dict[str, dict[str, int]] = defaultdict(
            lambda: {"total": 0, "completed": 0}
        )
        for ticket in tickets:
            pid = str(ticket.get("project_id"))
            if pid not in public_by_id:
                continue
            totals[pid]["total"] += 1
            if ticket.get("status") == TicketStatus.COMPLETED.value:
                totals[pid]["completed"] += 1

        rows: list[dict] = []
        for pid, project in public_by_id.items():
            counts = totals.get(pid, {"total": 0, "completed": 0})
            rows.append(
                {
                    "project_id": pid,
                    "project_name": project.get("name", ""),
                    "total": counts["total"],
                    "completed": counts["completed"],
                }
            )
        # Show the busiest projects first.
        rows.sort(key=lambda r: r["total"], reverse=True)
        return rows

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------

    def _resolve_range(
        self, date_from: Optional[date], date_to: Optional[date]
    ) -> tuple[date, date]:
        """Resolve the effective date range, applying defaults and clamping.

        Defaults to the last 30 days. If the caller passes an inverted range
        (``date_from`` after ``date_to``) the bounds are swapped so the query
        stays valid.
        """
        end = date_to or datetime.now(timezone.utc).date()
        start = date_from or (end - timedelta(days=_DEFAULT_RANGE_DAYS))
        if start > end:
            start, end = end, start
        return start, end

    @staticmethod
    def _start_of_day_iso(day: date) -> str:
        """ISO timestamp for the inclusive start (00:00:00 UTC) of a day."""
        return datetime(day.year, day.month, day.day, tzinfo=timezone.utc).isoformat()

    @staticmethod
    def _end_of_day_iso(day: date) -> str:
        """ISO timestamp for the inclusive end (23:59:59.999999 UTC) of a day."""
        return datetime(
            day.year, day.month, day.day, 23, 59, 59, 999999, tzinfo=timezone.utc
        ).isoformat()

    @staticmethod
    def _parse_dt(value: Any) -> Optional[datetime]:
        """Parse a Postgres/ISO timestamp string into a datetime, or None."""
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        text = str(value)
        # Normalize a trailing 'Z' which datetime.fromisoformat cannot parse.
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(text)
        except ValueError:
            return None

    @classmethod
    def _resolution_hours(cls, ticket: dict) -> Optional[float]:
        """Compute hours between creation and last update for a ticket.

        Used as a proxy for resolution time on completed tickets. Returns None
        when timestamps are missing or the delta is negative (clock skew).
        """
        created = cls._parse_dt(ticket.get("created_at"))
        updated = cls._parse_dt(ticket.get("updated_at"))
        if not created or not updated:
            return None
        delta_hours = (updated - created).total_seconds() / 3600
        return delta_hours if delta_hours >= 0 else None

    def _empty_metrics(self) -> dict[str, Any]:
        """Return a well-formed empty metrics payload (no data in scope)."""
        return {
            "summary": {
                "total_tickets": 0,
                "pending": 0,
                "in_progress": 0,
                "paused": 0,
                "in_review": 0,
                "completed": 0,
                "avg_resolution_hours": 0.0,
            },
            "by_type": [{"type": value, "count": 0} for value in _TYPES],
            "by_priority": [{"priority": value, "count": 0} for value in _PRIORITIES],
            "over_time": [],
            "by_project": [],
        }
