"""
Centralized Database Configuration
===================================
Single source of truth for all data-pipeline scripts.
Reads from environment variables with NO hardcoded fallback.

Usage:
    from shared.db_config import get_engine

    engine = get_engine()
"""

import os
from sqlalchemy import create_engine


def get_engine():
    """
    Build a SQLAlchemy engine from environment variables.

    Required env vars:
        DB_USER     - Database username
        DB_PASS     - Database password
        DB_HOST     - Database hostname
        DB_PORT     - Database port (default: 5432 for PostgreSQL)
        DB_NAME     - Database name

    Optional env vars:
        DB_URL      - Full connection URL (overrides individual vars)
    """
    # Allow a full URL override (useful for Supabase connection strings)
    full_url = os.environ.get("DB_URL")
    if full_url:
        return create_engine(full_url, echo=False)

    user = os.environ.get("DB_USER")
    password = os.environ.get("DB_PASS")
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    name = os.environ.get("DB_NAME", "eapcet_db")

    if not user or not password:
        raise EnvironmentError(
            "Missing required environment variables: DB_USER and DB_PASS. "
            "Set them before running any data-pipeline script.\n"
            "Example: export DB_USER=postgres DB_PASS=yourpassword"
        )

    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, echo=False)
