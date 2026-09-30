"""
init_pg.py  -  Run this once to create the 'drainwatch' database + tables
               on both local PostgreSQL and (optionally) Supabase.

Usage:
    python init_pg.py               -> init local only
    python init_pg.py --all         -> init local + online (Supabase)
"""
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import os

load_dotenv()

# ── Connection DSN builders ───────────────────────────────────────────────────
def _local_dsn(dbname=None):
    return dict(
        host=os.getenv("LOCAL_PG_HOST", "localhost"),
        port=int(os.getenv("LOCAL_PG_PORT", 5432)),
        dbname=dbname or os.getenv("LOCAL_PG_DB", "drainwatch"),
        user=os.getenv("LOCAL_PG_USER", "postgres"),
        password=os.getenv("LOCAL_PG_PASSWORD", "12345"),
    )

def _online_dsn():
    return dict(
        host=os.getenv("SUPABASE_HOST", ""),
        port=int(os.getenv("SUPABASE_PORT", 5432)),
        dbname=os.getenv("SUPABASE_DB", "postgres"),
        user=os.getenv("SUPABASE_USER", "postgres"),
        password=os.getenv("SUPABASE_PASSWORD", ""),
        sslmode="require",
    )

# ── DDL ───────────────────────────────────────────────────────────────────────
CREATE_READINGS = """
CREATE TABLE IF NOT EXISTS readings (
    id          SERIAL PRIMARY KEY,
    node_id     INTEGER      NOT NULL,
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    temp        REAL,
    hum         REAL,
    mq135       INTEGER      DEFAULT 0,
    h2s         INTEGER      DEFAULT 0,
    ch4         INTEGER      DEFAULT 0,
    rssi        INTEGER      DEFAULT 0,
    snr         REAL         DEFAULT 0,
    packet      INTEGER      DEFAULT 0,
    wlvl        INTEGER,
    wflow       REAL,
    battery     REAL         DEFAULT 100
);
"""

# Patch existing DBs that were created before wlvl/wflow/battery were added
PATCH_COLUMNS = """
ALTER TABLE readings ADD COLUMN IF NOT EXISTS wlvl    INTEGER;
ALTER TABLE readings ADD COLUMN IF NOT EXISTS wflow   REAL;
ALTER TABLE readings ADD COLUMN IF NOT EXISTS battery REAL DEFAULT 100;
"""

CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_readings_node_time
    ON readings (node_id, timestamp DESC);
"""

CREATE_TRACKING_SCHEMA = """
CREATE TABLE IF NOT EXISTS authorities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    parent_id INTEGER,
    jurisdiction TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (parent_id) REFERENCES authorities(id)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    authority_id INTEGER,
    phone TEXT,
    email TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (authority_id) REFERENCES authorities(id)
);

CREATE TABLE IF NOT EXISTS response_teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    authority_id INTEGER,
    team_type TEXT NOT NULL DEFAULT 'FIELD_TEAM',
    contact TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (authority_id) REFERENCES authorities(id)
);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_number TEXT NOT NULL UNIQUE,
    alert_id TEXT,
    node_id INTEGER,
    gateway_id TEXT,
    authority_id INTEGER,
    assigned_team_id INTEGER,
    assigned_user_id INTEGER,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'DETECTED',
    title TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    sector TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triaged_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (authority_id) REFERENCES authorities(id),
    FOREIGN KEY (assigned_team_id) REFERENCES response_teams(id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS incident_events (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    actor_id INTEGER,
    actor_role TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_assignments (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL,
    authority_id INTEGER,
    team_id INTEGER,
    user_id INTEGER,
    assigned_by INTEGER,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    reason TEXT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (authority_id) REFERENCES authorities(id),
    FOREIGN KEY (team_id) REFERENCES response_teams(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL,
    recipient_id INTEGER,
    recipient_role TEXT,
    channel TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_evidence (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL,
    uploaded_by TEXT,
    type TEXT NOT NULL,
    url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS escalation_rules (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    priority TEXT NOT NULL,
    after_minutes INTEGER NOT NULL,
    from_role TEXT,
    to_role TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, priority, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_node_category ON incidents(node_id, category, status);
CREATE INDEX IF NOT EXISTS idx_events_incident ON incident_events(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_incident ON notifications(incident_id, created_at DESC);
"""

# ── Init helpers ──────────────────────────────────────────────────────────────
def create_db_if_missing_local():
    """Create the 'drainwatch' database on local PG if it doesn't exist."""
    try:
        conn = psycopg2.connect(**_local_dsn(dbname="postgres"))
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        dbname = os.getenv("LOCAL_PG_DB", "drainwatch")
        cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (dbname,))
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"  [+] Created database '{dbname}'")
        else:
            print(f"  [ok] Database '{dbname}' already exists")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  [!] Could not create database: {e}")
        raise

def init_schema(dsn, label):
    try:
        conn = psycopg2.connect(**dsn)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(CREATE_READINGS)
        cur.execute(PATCH_COLUMNS)   # adds wlvl/wflow/battery to existing tables
        cur.execute(CREATE_INDEX)
        cur.execute(CREATE_TRACKING_SCHEMA)
        cur.close()
        conn.close()
        print(f"  [ok] [{label}] Schema initialised (with tracking tables)")
    except Exception as e:
        print(f"  [!] [{label}] Failed: {e}")
        raise

# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    init_online = "--all" in sys.argv

    print("\n---  DrainWatch DB Init  ---")
    print("\n[1/2] Local PostgreSQL ...")
    create_db_if_missing_local()
    init_schema(_local_dsn(), "Local PG")

    if init_online:
        print("\n[2/2] Supabase (online) ...")
        host = os.getenv("SUPABASE_HOST", "")
        if not host or "<YOUR_PROJECT_REF>" in host:
            print("  [!] SUPABASE_HOST not configured in backend/.env -- skipping")
        else:
            init_schema(_online_dsn(), "Supabase")
    else:
        print("\n[2/2] Supabase skipped (run with --all to init online DB too)")

    print("\n[OK] Done!\n")

if __name__ == "__main__":
    main()
