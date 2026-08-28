"""One-off migration runner. Executes a SQL file against the Supabase Postgres DB.

Usage:
    python run_migration.py migrations/001_initial_schema.sql

Reads the DB connection from the DATABASE_URL environment variable.
This script is a local dev utility and is gitignored.
"""

import os
import sys
from pathlib import Path
from typing import Optional

import psycopg


def _read_database_url_from_env_file() -> Optional[str]:
    """Read DATABASE_URL from the local .env file if present."""
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    return None


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <path_to_sql_file>")
        sys.exit(1)

    sql_path = sys.argv[1]
    db_url = os.environ.get("DATABASE_URL") or _read_database_url_from_env_file()
    if not db_url:
        print("ERROR: DATABASE_URL not set (checked environment and .env file).")
        sys.exit(1)

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print("Connecting to database...")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    print(f"Migration '{sql_path}' executed successfully.")


if __name__ == "__main__":
    main()
