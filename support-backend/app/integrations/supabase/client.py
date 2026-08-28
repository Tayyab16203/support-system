"""Supabase client initialization and management."""

from supabase import Client, create_client

from app.config import settings

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """Get or create the Supabase client singleton.

    Uses the service_role key which bypasses RLS.
    Authorization is enforced at the application layer.

    Returns:
        Initialized Supabase client instance.
    """
    global _supabase_client

    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables."
            )
        _supabase_client = create_client(settings.supabase_url, settings.supabase_key)

    return _supabase_client


def get_table(table_name: str):
    """Get a table query builder from the Supabase client.

    Args:
        table_name: Name of the database table.

    Returns:
        Supabase table query builder.
    """
    client = get_supabase_client()
    return client.table(table_name)