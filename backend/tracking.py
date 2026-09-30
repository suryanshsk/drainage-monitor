from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

import db


class IncidentCategory(str, Enum):
    WATER_LEVEL = "WATER_LEVEL"
    FLOOD_RISK = "FLOOD_RISK"
    BLOCKAGE = "BLOCKAGE"
    METHANE = "METHANE"
    H2S = "H2S"
    AIR_QUALITY = "AIR_QUALITY"
    SENSOR_FAILURE = "SENSOR_FAILURE"
    GATEWAY_FAILURE = "GATEWAY_FAILURE"
    TAMPER = "TAMPER"
    BATTERY = "BATTERY"
    COMMUNICATION_FAILURE = "COMMUNICATION_FAILURE"
    PREDICTIVE_RISK = "PREDICTIVE_RISK"
    MAINTENANCE = "MAINTENANCE"
    OTHER = "OTHER"


class IncidentPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    TRIAGED = "TRIAGED"
    ASSIGNED = "ASSIGNED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    FIELD_VERIFICATION = "FIELD_VERIFICATION"
    RESOLVED = "RESOLVED"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"
    ESCALATED = "ESCALATED"
    REOPENED = "REOPENED"
    CANCELLED = "CANCELLED"


VALID_TRANSITIONS = {
    IncidentStatus.DETECTED: {IncidentStatus.TRIAGED, IncidentStatus.ASSIGNED, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED},
    IncidentStatus.TRIAGED: {IncidentStatus.ASSIGNED, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED},
    IncidentStatus.ASSIGNED: {IncidentStatus.ACKNOWLEDGED, IncidentStatus.IN_PROGRESS, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED},
    IncidentStatus.ACKNOWLEDGED: {IncidentStatus.IN_PROGRESS, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED},
    IncidentStatus.IN_PROGRESS: {IncidentStatus.FIELD_VERIFICATION, IncidentStatus.RESOLVED, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED},
    IncidentStatus.FIELD_VERIFICATION: {IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED},
    IncidentStatus.RESOLVED: {IncidentStatus.VERIFIED, IncidentStatus.REOPENED},
    IncidentStatus.VERIFIED: {IncidentStatus.CLOSED, IncidentStatus.REOPENED},
    IncidentStatus.ESCALATED: {IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.IN_PROGRESS, IncidentStatus.FIELD_VERIFICATION, IncidentStatus.CANCELLED},
    IncidentStatus.REOPENED: {IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.ESCALATED},
    IncidentStatus.CANCELLED: set(),
    IncidentStatus.CLOSED: set(),
}


def _now_ts() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_enum_value(value: Any) -> str:
    if isinstance(value, Enum):
        return str(value.value).upper()
    text = str(value).upper()
    if "." in text:
        text = text.split(".")[-1]
    return text


def calculate_priority(
    category: IncidentCategory | str,
    water_level: float = 0,
    methane: float = 0,
    h2s: float = 0,
    duration_minutes: float = 0,
    affected_nodes: int = 1,
    communication_loss: float = 0,
    risk_score: float = 0.0,
) -> IncidentPriority:
    score = 0
    category_name = _normalize_enum_value(category)

    if category_name in {IncidentCategory.WATER_LEVEL.value, IncidentCategory.FLOOD_RISK.value}:
        score += min(35, water_level * 0.35)
    if category_name == IncidentCategory.BLOCKAGE.value:
        score += 20 + min(15, max(0, water_level - 30) * 0.2)
    if category_name in {IncidentCategory.METHANE.value, IncidentCategory.H2S.value}:
        score += min(20, methane * 0.2)
        score += min(18, h2s * 0.6)
    if methane >= 20:
        score += 20
    if h2s >= 10:
        score += 18
    if water_level >= 85:
        score += 25
    if communication_loss > 30:
        score += 15
    if duration_minutes >= 20:
        score += 10
    if affected_nodes >= 3:
        score += 12
    score += int(risk_score * 30)

    if score >= 80 or (water_level >= 90 and methane >= 15):
        return IncidentPriority.CRITICAL
    if score >= 55:
        return IncidentPriority.HIGH
    if score >= 30:
        return IncidentPriority.MEDIUM
    return IncidentPriority.LOW


def is_valid_status_transition(current: IncidentStatus | str, target: IncidentStatus | str) -> bool:
    current_value = IncidentStatus(_normalize_enum_value(current)) if not isinstance(current, IncidentStatus) else current
    target_value = IncidentStatus(_normalize_enum_value(target)) if not isinstance(target, IncidentStatus) else target
    return target_value in VALID_TRANSITIONS.get(current_value, set())


def build_incident_title(category: str | IncidentCategory, node_label: str) -> str:
    label = _normalize_enum_value(category).replace("_", " ").title()
    return f"{label} at {node_label}"


def build_escalation_chain(category: str | IncidentCategory, priority: IncidentPriority | str) -> list[dict]:
    category_name = _normalize_enum_value(category)
    priority_name = _normalize_enum_value(priority)

    base_chain = [
        {
            "step": 1,
            "role": "Field Response Team",
            "ministry": "Municipal Drainage Operations",
            "channel": "SMS + in-app",
            "reason": "Primary local response team",
            "contact": "Beta-I Field Unit",
        },
        {
            "step": 2,
            "role": "Municipal Supervisor",
            "ministry": "Greater Noida Municipal Corporation",
            "channel": "Dashboard + dispatch",
            "reason": "District-level coordination",
            "contact": "Municipal Ops Desk",
        },
        {
            "step": 3,
            "role": "State Water Authority",
            "ministry": "State Urban Water Department",
            "channel": "Email + escalation alert",
            "reason": "Regional water network oversight",
            "contact": "State Response Cell",
        },
        {
            "step": 4,
            "role": "National oversight",
            "ministry": "Ministry of Jal Shakti",
            "channel": "Executive dashboard + briefing",
            "reason": "Strategic public utility response",
            "contact": "National Drainage Coordination",
        },
    ]

    if priority_name in {IncidentPriority.CRITICAL.value, "CRITICAL"} or category_name in {IncidentCategory.FLOOD_RISK.value, IncidentCategory.WATER_LEVEL.value, IncidentCategory.METHANE.value, IncidentCategory.H2S.value}:
        return base_chain

    if priority_name in {IncidentPriority.HIGH.value, "HIGH"}:
        return base_chain[:3]

    return base_chain[:2]


def _execute_returning_id(sql: str, params: tuple | dict | None = None) -> Optional[int]:
    conn = db.get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
        conn.commit()
        if row is None:
            return None
        if isinstance(row, dict):
            value = row.get("id")
            if value is not None:
                return int(value)
            if row:
                return int(next(iter(row.values())))
            return None
        try:
            return int(row[0])
        except (TypeError, KeyError, IndexError):
            if hasattr(row, "values"):
                values = tuple(row.values())
                if values and values[0] is not None:
                    return int(values[0])
            return None
    finally:
        db.release_conn(conn)


def _now_iso() -> str:
    return _now_ts().isoformat()


def _get_default_authority_id() -> int:
    row = db.query_one("SELECT id FROM authorities WHERE type = 'MUNICIPAL' ORDER BY id ASC LIMIT 1")
    if row:
        return int(row["id"])
    return ensure_default_tracking_records()["municipal_authority_id"]


def _get_default_team_id() -> Optional[int]:
    row = db.query_one("SELECT id FROM response_teams WHERE team_type = 'FIELD_TEAM' ORDER BY id ASC LIMIT 1")
    if row:
        return int(row["id"])
    return None


def _get_default_user_id() -> Optional[int]:
    row = db.query_one("SELECT id FROM users WHERE role = 'FIELD_WORKER' ORDER BY id ASC LIMIT 1")
    if row:
        return int(row["id"])
    return None


def _get_location_for_node(node_id: int) -> dict:
    locations = {
        0: {"lat": 28.476502, "lng": 77.504466, "label": "Block A, Beta I, Greater Noida – Master Node"},
        1: {"lat": 28.477414, "lng": 77.503938, "label": "Block A, Beta I, Greater Noida"},
        2: {"lat": 28.478387, "lng": 77.504407, "label": "Block B, Beta I, Greater Noida"},
    }
    return locations.get(node_id, {"lat": 28.476502, "lng": 77.504466, "label": f"Node {node_id}"})


def ensure_default_tracking_records() -> dict[str, int]:
    db.ensure_tracking_schema()

    authorities = [
        ("Field Response Unit", "FIELD_TEAM", 1, None, "Beta I", "field@drainwatch.local", "+91-00000-00000"),
        ("Municipal Operations", "MUNICIPAL", 2, None, "Beta I", "municipal@drainwatch.local", "+91-00000-00001"),
        ("Regional Sewage Authority", "REGIONAL", 3, None, "Greater Noida", "regional@drainwatch.local", "+91-00000-00002"),
        ("State Water Authority", "STATE", 4, None, "Uttar Pradesh", "state@drainwatch.local", "+91-00000-00003"),
        ("Central Infrastructure Oversight", "CENTRAL", 5, None, "National", "central@drainwatch.local", "+91-00000-00004"),
        ("Governance Oversight Desk", "OVERSIGHT", 6, None, "National", "oversight@drainwatch.local", "+91-00000-00005"),
    ]

    created_ids: dict[str, int] = {}
    for name, authority_type, level, parent_id, jurisdiction, email, phone in authorities:
        row = db.query_one(
            "SELECT id FROM authorities WHERE name=%s AND type=%s LIMIT 1",
            (name, authority_type),
        )
        if row:
            created_ids[authority_type.lower()] = int(row["id"])
            continue
        authority_id = _execute_returning_id(
            "INSERT INTO authorities (name, type, level, parent_id, jurisdiction, contact_email, contact_phone, active) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id",
            (name, authority_type, level, parent_id, jurisdiction, email, phone),
        )
        created_ids[authority_type.lower()] = authority_id or 0

    team_row = db.query_one("SELECT id FROM response_teams WHERE name = 'Beta-I Drainage Response Team' LIMIT 1")
    if not team_row:
        municipal_id = created_ids.get("municipal") or _get_default_authority_id()
        db.execute(
            "INSERT INTO response_teams (name, authority_id, team_type, contact, active) VALUES (%s, %s, %s, %s, TRUE)",
            ("Beta-I Drainage Response Team", municipal_id, "FIELD_TEAM", "+91-00000-00010"),
        )

    worker_row = db.query_one("SELECT id FROM users WHERE name = 'Operator 07' LIMIT 1")
    if not worker_row:
        municipal_id = created_ids.get("municipal") or _get_default_authority_id()
        db.execute(
            "INSERT INTO users (name, role, authority_id, phone, email, active) VALUES (%s, %s, %s, %s, %s, TRUE)",
            ("Operator 07", "FIELD_WORKER", municipal_id, "+91-00000-00011", "operator07@drainwatch.local"),
        )

    rule_count = db.query_one("SELECT COUNT(*) as cnt FROM escalation_rules")
    if not rule_count or int(rule_count["cnt"]) == 0:
        default_rules = [
            ("Critical acknowledgement", "CRITICAL", 5, "FIELD_WORKER", "MUNICIPAL"),
            ("Critical escalation", "CRITICAL", 10, "MUNICIPAL", "REGIONAL"),
            ("Regional escalation", "CRITICAL", 20, "REGIONAL", "STATE"),
            ("State escalation", "CRITICAL", 30, "STATE", "CENTRAL"),
            ("Oversight escalation", "CRITICAL", 45, "CENTRAL", "OVERSIGHT"),
        ]
        for name, priority, after_minutes, from_role, to_role in default_rules:
            db.execute(
                "INSERT INTO escalation_rules (name, priority, after_minutes, from_role, to_role, enabled) VALUES (%s, %s, %s, %s, %s, TRUE)",
                (name, priority, after_minutes, from_role, to_role),
            )
    return created_ids


def infer_category_from_alert(alert: dict) -> IncidentCategory:
    title = str(alert.get("title") or "").lower()
    category = alert.get("category") or ""
    if category == "flood" or "water" in title or "overflow" in title:
        return IncidentCategory.FLOOD_RISK
    if category == "gas" or "methane" in title or "ch4" in title:
        return IncidentCategory.METHANE
    if "h2s" in title:
        return IncidentCategory.H2S
    if "battery" in title.lower():
        return IncidentCategory.BATTERY
    if "tamper" in title:
        return IncidentCategory.TAMPER
    if "network" in title or "signal" in title or "rssi" in title or "gateway" in title:
        return IncidentCategory.COMMUNICATION_FAILURE
    if "blockage" in title or "clog" in title:
        return IncidentCategory.BLOCKAGE
    return IncidentCategory.OTHER


def _incident_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    total = db.query_one("SELECT COUNT(*) as cnt FROM incidents WHERE created_at >= CURRENT_DATE")
    count = int((total or {}).get("cnt", 0)) + 1 if total else 1
    return f"INC-{today}-{count:04d}"


def add_incident_event(incident_id: int, event_type: str, message: str, *, actor_id: Optional[int] = None, actor_role: Optional[str] = None, metadata: Optional[dict] = None) -> None:
    db.execute(
        "INSERT INTO incident_events (incident_id, event_type, actor_id, actor_role, message, metadata) VALUES (%s, %s, %s, %s, %s, %s)",
        (incident_id, event_type, actor_id, actor_role, message, metadata or {}),
    )


def create_notification(incident_id: int, *, recipient_role: str = "MUNICIPAL_OPERATOR", channel: str = "IN_APP", message: str = "Incident created") -> None:
    db.execute(
        "INSERT INTO notifications (incident_id, recipient_role, channel, message, status) VALUES (%s, %s, %s, %s, 'QUEUED')",
        (incident_id, recipient_role, channel, message),
    )


def maybe_create_incident_from_alert(alert: dict) -> Optional[dict]:
    if not alert:
        return None

    node_id = int(alert.get("nodeId") or alert.get("node_id") or 0)
    category_name = str(infer_category_from_alert(alert)).upper()
    title = build_incident_title(category_name, f"Node {node_id}")
    existing = db.query_one(
        "SELECT * FROM incidents WHERE node_id=%s AND category=%s AND status NOT IN ('RESOLVED', 'VERIFIED', 'CLOSED', 'CANCELLED') ORDER BY created_at DESC LIMIT 1",
        (node_id, category_name),
    )
    if existing:
        return dict(existing)

    node_info = db.query_one("SELECT * FROM readings WHERE node_id=%s ORDER BY id DESC LIMIT 1", (node_id,))
    sensor_snapshot = node_info or {}
    location = _get_location_for_node(node_id)
    priority = calculate_priority(
        category=category_name,
        water_level=float(alert.get("value") if alert.get("category") == "flood" else (sensor_snapshot.get("wlvl") or 0)),
        methane=float(sensor_snapshot.get("ch4") or 0),
        h2s=float(sensor_snapshot.get("h2s") or 0),
        duration_minutes=5,
        affected_nodes=1,
        communication_loss=0,
        risk_score=0.7,
    )

    authority_id = _get_default_authority_id()
    team_id = _get_default_team_id()
    user_id = _get_default_user_id()
    incident_number = _incident_number()
    incident_id = _execute_returning_id(
        """
        INSERT INTO incidents (
            incident_number, alert_id, node_id, gateway_id, authority_id, assigned_team_id,
            assigned_user_id, category, priority, status, title, description,
            latitude, longitude, sector, detected_at, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'DETECTED', %s, %s, %s, %s, %s, NOW(), NOW(), NOW()) RETURNING id
        """,
        (
            incident_number,
            alert.get("id") or f"ALT-{node_id}-{int(datetime.now(timezone.utc).timestamp())}",
            node_id,
            "gw-master",
            authority_id,
            team_id,
            user_id,
            category_name,
            priority.value,
            title,
            alert.get("message") or f"An abnormal condition was detected on node {node_id}.",
            location["lat"],
            location["lng"],
            location.get("label") or "Beta I",
        ),
    )

    if incident_id is None:
        return None

    add_incident_event(
        incident_id,
        "DETECTED",
        f"Telemetry from Node {node_id} triggered an alert and created incident {incident_number}.",
        metadata={"alertId": alert.get("id")},
    )
    if team_id:
        db.execute(
            "INSERT INTO incident_assignments (incident_id, authority_id, team_id, user_id, assigned_by, reason) VALUES (%s, %s, %s, %s, %s, %s)",
            (incident_id, authority_id, team_id, user_id, user_id, "Auto-assigned based on node alert"),
        )
    create_notification(incident_id, recipient_role="MUNICIPAL_OPERATOR", channel="IN_APP", message=f"Incident {incident_number} created for Node {node_id}")

    return get_incident_detail(incident_id)


def list_incidents() -> list[dict]:
    rows = db.query("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 200")
    return [dict(r) for r in rows]


def get_incident_detail(incident_id: int) -> Optional[dict]:
    incident = db.query_one("SELECT * FROM incidents WHERE id=%s", (incident_id,))
    if not incident:
        return None
    incident_dict = dict(incident)
    incident_dict["events"] = db.query("SELECT * FROM incident_events WHERE incident_id=%s ORDER BY created_at ASC", (incident_id,))
    incident_dict["notifications"] = db.query("SELECT * FROM notifications WHERE incident_id=%s ORDER BY created_at DESC", (incident_id,))
    incident_dict["evidence"] = db.query("SELECT * FROM incident_evidence WHERE incident_id=%s ORDER BY created_at DESC", (incident_id,))
    incident_dict["assignments"] = db.query("SELECT * FROM incident_assignments WHERE incident_id=%s ORDER BY assigned_at DESC", (incident_id,))
    return incident_dict


def transition_incident_status(incident_id: int, new_status: str, message: str, *, actor_id: Optional[int] = None, actor_role: Optional[str] = None, metadata: Optional[dict] = None) -> dict:
    incident = db.query_one("SELECT * FROM incidents WHERE id=%s", (incident_id,))
    if not incident:
        raise ValueError(f"Incident {incident_id} not found")

    current = str(incident["status"])
    if not is_valid_status_transition(current, new_status):
        raise ValueError(f"Invalid transition: {current} -> {new_status}")

    updates = ["status = %s", "updated_at = NOW()"]
    params: list[Any] = [new_status]

    if new_status == IncidentStatus.TRIAGED.value:
        updates.append("triaged_at = NOW()")
    elif new_status == IncidentStatus.ASSIGNED.value:
        updates.append("assigned_at = NOW()")
    elif new_status == IncidentStatus.ACKNOWLEDGED.value:
        updates.append("acknowledged_at = NOW()")
    elif new_status == IncidentStatus.IN_PROGRESS.value:
        updates.append("started_at = NOW()")
    elif new_status == IncidentStatus.RESOLVED.value:
        updates.append("resolved_at = NOW()")
    elif new_status == IncidentStatus.VERIFIED.value:
        updates.append("verified_at = NOW()")
    elif new_status == IncidentStatus.CLOSED.value:
        updates.append("closed_at = NOW()")
    elif new_status == IncidentStatus.CANCELLED.value:
        updates.append("closed_at = NOW()")

    params.append(incident_id)
    sql = f"UPDATE incidents SET {', '.join(updates)} WHERE id = %s"
    db.execute(sql, tuple(params))
    add_incident_event(incident_id, new_status, message, actor_id=actor_id, actor_role=actor_role, metadata=metadata)
    return get_incident_detail(incident_id) or {}


def assign_incident(incident_id: int, authority_id: int, team_id: int | None = None, user_id: int | None = None, assigned_by: int | None = None, reason: str = "Assigned by system") -> dict:
    if team_id is not None:
        db.execute("UPDATE incidents SET assigned_team_id=%s, authority_id=%s, assigned_user_id=%s, assigned_at=NOW(), updated_at=NOW() WHERE id=%s", (team_id, authority_id, user_id, incident_id))
    else:
        db.execute("UPDATE incidents SET authority_id=%s, assigned_user_id=%s, assigned_at=NOW(), updated_at=NOW() WHERE id=%s", (authority_id, user_id, incident_id))
    db.execute(
        "INSERT INTO incident_assignments (incident_id, authority_id, team_id, user_id, assigned_by, reason) VALUES (%s, %s, %s, %s, %s, %s)",
        (incident_id, authority_id, team_id, user_id, assigned_by, reason),
    )
    return transition_incident_status(incident_id, IncidentStatus.ASSIGNED.value, f"Assigned to team {team_id or 'response unit'}.", actor_id=assigned_by, actor_role="MUNICIPAL_OPERATOR")


def create_evidence_record(incident_id: int, evidence_type: str, url: str, description: str, uploaded_by: str = "operator") -> dict:
    evidence_id = _execute_returning_id(
        "INSERT INTO incident_evidence (incident_id, uploaded_by, type, url, description) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (incident_id, uploaded_by, evidence_type, url, description),
    )
    if evidence_id is None:
        raise ValueError("Evidence insert failed")
    add_incident_event(incident_id, "EVIDENCE_ADDED", description, actor_role="FIELD_WORKER", metadata={"type": evidence_type, "url": url})
    return db.query_one("SELECT * FROM incident_evidence WHERE id=%s", (evidence_id,))


def get_tracking_overview() -> dict:
    incidents = list_incidents()
    active = [i for i in incidents if i["status"] not in {IncidentStatus.RESOLVED.value, IncidentStatus.VERIFIED.value, IncidentStatus.CLOSED.value, IncidentStatus.CANCELLED.value}]
    critical = sum(1 for i in active if i["priority"] == IncidentPriority.CRITICAL.value)
    unack = sum(1 for i in active if i["status"] in {IncidentStatus.DETECTED.value, IncidentStatus.TRIAGED.value, IncidentStatus.ASSIGNED.value})
    in_response = sum(1 for i in active if i["status"] in {IncidentStatus.ACKNOWLEDGED.value, IncidentStatus.IN_PROGRESS.value, IncidentStatus.FIELD_VERIFICATION.value, IncidentStatus.ESCALATED.value})
    escalated = sum(1 for i in active if i["status"] == IncidentStatus.ESCALATED.value)
    resolved_today = sum(1 for i in incidents if i["status"] == IncidentStatus.CLOSED.value and str(i["closed_at"])[:10] == datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    return {
        "total_incidents": len(incidents),
        "active_incidents": len(active),
        "critical": critical,
        "awaiting_acknowledgement": unack,
        "in_response": in_response,
        "escalated": escalated,
        "resolved_today": resolved_today,
    }


def get_tracking_map() -> list[dict]:
    incidents = list_incidents()
    result = []
    for incident in incidents:
        if incident.get("status") in {IncidentStatus.CLOSED.value, IncidentStatus.CANCELLED.value}:
            continue
        result.append({
            "id": incident["id"],
            "incidentNumber": incident["incident_number"],
            "nodeId": incident["node_id"],
            "priority": incident["priority"],
            "status": incident["status"],
            "sector": incident.get("sector") or "Beta I",
            "latitude": incident.get("latitude") or 28.476502,
            "longitude": incident.get("longitude") or 77.504466,
        })
    return result


def get_tracking_statistics() -> dict:
    incidents = list_incidents()
    by_category: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    for incident in incidents:
        by_category[incident["category"]] = by_category.get(incident["category"], 0) + 1
        by_priority[incident["priority"]] = by_priority.get(incident["priority"], 0) + 1
    return {
        "total": len(incidents),
        "byCategory": by_category,
        "byPriority": by_priority,
        "criticalRate": round((by_priority.get(IncidentPriority.CRITICAL.value, 0) / len(incidents)) * 100, 1) if incidents else 0,
        "resolvedRate": round((sum(1 for i in incidents if i["status"] in {IncidentStatus.RESOLVED.value, IncidentStatus.VERIFIED.value, IncidentStatus.CLOSED.value}) / len(incidents)) * 100, 1) if incidents else 0,
    }


def get_notifications() -> list[dict]:
    return db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200")


def get_authorities() -> list[dict]:
    return db.query("SELECT * FROM authorities ORDER BY level ASC, name ASC")


def get_response_teams() -> list[dict]:
    return db.query("SELECT * FROM response_teams ORDER BY name ASC")


def get_escalation_rules() -> list[dict]:
    return db.query("SELECT * FROM escalation_rules ORDER BY after_minutes ASC")
