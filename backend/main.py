from fastapi import FastAPI, Request, Form, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import random

import db  # ← dual-write PostgreSQL layer
import tracking

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.ensure_tracking_schema()
    tracking.ensure_default_tracking_records()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────
def parse_lora_string(raw: str) -> dict:
    """
    Parses the ESP32 slave packet format:
    NODE=1,PKT=5,TEMP=26.3,HUM=58.2,MQ135=310,H2S=45,CH4=80,WLVL=50,WFLOW=1.2,BAT=85
    """
    result = {}
    for part in raw.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            result[k.strip().upper()] = v.strip()
    return result


# ──────────────────────────────────────────────
# INGEST ENDPOINT  ← ESP32 Master posts here
# ──────────────────────────────────────────────
@app.post("/lora-data")
async def receive_lora_data(
    request: Request,
    background_tasks: BackgroundTasks,
    data: str   = Form(default=""),
    rssi: int   = Form(default=0),
    snr:  float = Form(default=0.0),
    packet: int = Form(default=0),
):
    """Accept form-encoded POST from ESP32 Master (sendToServer function)."""
    parsed = parse_lora_string(data)

    try:
        node_id_str = parsed.get("NODE", "0")
        node_id = 0 if node_id_str.lower() == "master" else int(node_id_str)
        temp_s  = parsed.get("TEMP", "nan")
        hum_s   = parsed.get("HUM",  "nan")
        temp    = float(temp_s) if temp_s.lower() != "nan" else None
        hum     = float(hum_s)  if hum_s.lower()  != "nan" else None
        mq135   = int(float(parsed.get("MQ135", 0)))
        h2s     = int(float(parsed.get("H2S",   0)))
        ch4     = int(float(parsed.get("CH4",   0)))
        wlvl    = int(float(parsed.get("WLVL", 0))) if "WLVL" in parsed else None
        wflow   = float(parsed.get("WFLOW", 0.0)) if "WFLOW" in parsed else None
        bat     = float(parsed.get("BAT", 0.0)) if "BAT" in parsed else None
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=400)

    ts = datetime.now(timezone.utc).isoformat()
    background_tasks.add_task(db.insert_reading, node_id, ts, temp, hum, mq135, h2s, ch4, rssi, snr, packet, wlvl, wflow, bat)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Node {node_id} | "
          f"T={temp} H={hum} MQ135={mq135} H2S={h2s} CH4={ch4} WLVL={wlvl} FLOW={wflow} BAT={bat}")
    return {"status": "success", "node": node_id}


# Also accept JSON POST (for any future use / manual testing)
@app.post("/api/data")
async def receive_json_data(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.body()
        raw = body.decode("utf-8").strip()
        try:
            d = json.loads(raw)
            node_id_val = d.get("node", 0)
            node_id = 0 if str(node_id_val).lower() == "master" else int(node_id_val)
            temp    = d.get("temp")
            hum     = d.get("hum")
            mq135   = d.get("mq135", 0)
            h2s     = d.get("h2s", 0)
            ch4     = d.get("ch4", 0)
            rssi    = d.get("rssi", 0)
            snr     = d.get("snr", 0.0)
            packet  = d.get("packet", 0)
            wlvl    = d.get("wlvl")
            wflow   = d.get("wflow")
            bat     = d.get("bat")
        except json.JSONDecodeError:
            parsed  = parse_lora_string(raw)
            node_id_str = parsed.get("NODE", "0")
            node_id = 0 if node_id_str.lower() == "master" else int(node_id_str)
            temp    = float(parsed.get("TEMP", 0))
            hum     = float(parsed.get("HUM", 0))
            mq135   = int(float(parsed.get("MQ135", 0)))
            h2s     = int(float(parsed.get("H2S", 0)))
            ch4     = int(float(parsed.get("CH4", 0)))
            rssi    = 0; snr = 0.0; packet = 0
            wlvl    = int(float(parsed.get("WLVL", 0))) if "WLVL" in parsed else None
            wflow   = float(parsed.get("WFLOW", 0.0)) if "WFLOW" in parsed else None
            bat     = float(parsed.get("BAT", 0.0)) if "BAT" in parsed else None

        ts = datetime.now(timezone.utc).isoformat()
        background_tasks.add_task(db.insert_reading, node_id, ts, temp, hum, mq135, h2s, ch4, rssi, snr, packet, wlvl, wflow, bat)
        return {"status": "success", "node": node_id}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=400)

async def simulate_node1():
    while True:
        try:
            ts = datetime.now(timezone.utc).isoformat()
            
            # Master Node (Node 0) - PG
            await db.insert_reading(0, ts, 26.5, 55.0, 400, 400, 400, -30, 0.0, 0, 0, 0.0, 100.0)
            
            # Slave Node 1 (Node 1) - Drainage Block A
            temp1 = 26.0 + random.uniform(-0.5, 0.5)
            hum1 = 50.0 + random.uniform(-2, 2)
            mq135_1 = int(400 + random.uniform(-10, 20))
            h2s_1 = int(400 + random.uniform(-5, 5))
            ch4_1 = int(400 + random.uniform(-10, 10))
            rssi1 = int(-45 + random.uniform(-5, 5))
            await db.insert_reading(1, ts, temp1, hum1, mq135_1, h2s_1, ch4_1, rssi1, 0.0, 0, 25, 0.5, 98.5)
            
            # Slave Node 2 (Node 2) - Block B
            temp2 = 25.5 + random.uniform(-0.5, 0.5)
            hum2 = 52.0 + random.uniform(-2, 2)
            mq135_2 = int(400 + random.uniform(-10, 20))
            h2s_2 = int(400 + random.uniform(-5, 5))
            ch4_2 = int(400 + random.uniform(-10, 10))
            rssi2 = int(-55 + random.uniform(-5, 5))
            await db.insert_reading(2, ts, temp2, hum2, mq135_2, h2s_2, ch4_2, rssi2, 0.0, 0, 0, 0.0, 99.0)
            
        except Exception as e:
            print(f"Simulate error: {e}")
        await asyncio.sleep(7)

# ──────────────────────────────────────────────
# NORMALIZATION HELPERS
# ──────────────────────────────────────────────
# Baselines are the ADC readings observed in CLEAN AIR (room environment).
# Subtract baseline so clean air → 0 output.
# MQ sensors need 24-48 hr warm-up; re-run init_pg.py --calibrate after
# sensors stabilise to update these values automatically.
#
# How to re-calibrate: note the steady ADC values after 48 hr warm-up,
# then update the three BASELINE constants below.
#
#   Sensor       Clean-air ADC observed    Real-world clean-air value
#   MQ-135       ~2632                     CO2 ~400 ppm, NH3 ~0 ppm
#   H2S (MQ-136) ~ 932                     0 ppm H2S
#   CH4 (MQ-4)   ~1936                     ~0% LEL (atmospheric CH4 is 0.02%)

MQ135_BASELINE = 2000   # ADC in clean air  →  output = 400 AQI (baseline AQI)
H2S_BASELINE   = 600    # ADC in clean air  →  output = ~0.5 - 0.8 ppm
H2S_MIN_NOISE  = 350    # Noise floor ADC
CH4_BASELINE   = 2400   # ADC in clean air  →  output = ~1.0 - 1.5 % LEL
CH4_MIN_NOISE  = 1500   # Noise floor ADC

# Realistic noise floors — sensors always show a tiny non-zero value in clean air.
# CH4 : ~0.3% LEL  (atmospheric methane is ~1.7 ppm = 0.003% LEL but sensor noise adds more)
# H2S : ~0.2 ppm   (trace sulfur compounds always present in ambient air)
NOISE_FLOOR_CH4 = 0.3   # % LEL
NOISE_FLOOR_H2S = 0.2   # ppm

def norm_ch4(raw: int) -> float:
    """Map raw ADC to % LEL. Ambient noise (1200-1800) maps safely to 0.0-1.5% LEL (inside 0-3% normal range). Real gas scales to 100%."""
    if raw < CH4_MIN_NOISE:
        return 0.0
    if raw <= CH4_BASELINE:
        return round((raw - CH4_MIN_NOISE) / float(CH4_BASELINE - CH4_MIN_NOISE) * 1.5, 1)
    
    # Above baseline, scale 1.5% to 100%
    return round(min(100.0, 1.5 + (raw - CH4_BASELINE) / float(4095 - CH4_BASELINE) * 98.5), 1)

def norm_h2s(raw: int) -> float:
    """Map raw ADC to ppm H2S. Ambient noise (350-600) maps safely to 0.0-0.8 ppm (inside 0-6 ppm normal range). Real gas scales to 50 ppm."""
    if raw < H2S_MIN_NOISE:
        return 0.0
    if raw <= H2S_BASELINE:
        return round((raw - H2S_MIN_NOISE) / float(H2S_BASELINE - H2S_MIN_NOISE) * 0.8, 1)
    
    return round(min(50.0, 0.8 + (raw - H2S_BASELINE) / float(4095 - H2S_BASELINE) * 49.2), 1)

def norm_mq135(raw: int) -> int:
    """Map raw ADC to AQI. Ambient air (~2000-2200) maps around 400-500. Elevated pollutants scale smoothly to 2000+."""
    if raw <= MQ135_BASELINE:
        return max(350, int(400 - (MQ135_BASELINE - raw) * 0.05))
    scaled = int((raw - MQ135_BASELINE) / float(4095 - MQ135_BASELINE) * 1600)
    return min(4095, 400 + scaled)



def get_sector_name(nid: int) -> str:
    if nid == 0:
        return "Block A, Beta 1, Greater Noida"
    elif nid == 1:
        return "Block A, Beta 1, Greater Noida"
    elif nid == 2:
        return "Block B, Beta 1, Greater Noida"
    return f"Sector {chr(64 + nid)}"


# ──────────────────────────────────────────────
# DASHBOARD API ENDPOINTS
# ──────────────────────────────────────────────
def latest_per_node() -> list[dict]:
    return db.query("""
        SELECT r.* FROM readings r
        INNER JOIN (
            SELECT node_id, MAX(id) as max_id FROM readings GROUP BY node_id
        ) latest ON r.id = latest.max_id
    """)


def node_to_drain_node(r: dict) -> dict:
    node_id = str(r["node_id"])
    ch4_lel   = norm_ch4(r.get("ch4") or 0)
    h2s_ppm   = norm_h2s(r.get("h2s") or 0)
    mq135_val = norm_mq135(r.get("mq135") or 0)
    water_lvl = r.get("wlvl") or 0
    water_flw = r.get("wflow") or 0.0
    battery   = r.get("battery") or 100.0

    status = "online"
    
    # Check for staleness (offline if no data for >5 minutes)
    ts = r.get("timestamp")
    now = datetime.now(timezone.utc)
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts)
        except ValueError:
            pass
            
    if isinstance(ts, datetime) and (now - ts).total_seconds() > 300:
        status = "offline"
    else:
        # User requested: critical if >= 100% (overflow), warning if > 75%
        if ch4_lel > 20 or h2s_ppm > 10 or water_lvl >= 100:
            status = "critical"
        elif ch4_lel > 10 or h2s_ppm > 5 or water_lvl > 75:
            status = "warning"

    nid = r["node_id"]
    sector_name = get_sector_name(nid)
    # Real GPS coordinates (Beta I, Greater Noida, UP 201310)
    locations = {
        0: {"lat": 28.476502, "lng": 77.504466, "label": "Block A, Beta I, Greater Noida – Master Node"},
        1: {"lat": 28.477414, "lng": 77.503938, "label": "Block A, Beta I, Greater Noida"},
        2: {"lat": 28.478387, "lng": 77.504407, "label": "Block B, Beta I, Greater Noida"},
    }
    loc = locations.get(nid, {"lat": 28.476502, "lng": 77.504466, "label": f"Node {node_id} – {sector_name}"})

    ts = r.get("timestamp")
    ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

    return {
        "id": node_id,
        "sector": sector_name,
        "status": status,
        "location": loc,
        "waterLevel": water_lvl,
        "methaneLEL": ch4_lel,
        "h2sPpm": h2s_ppm,
        "temperature": r.get("temp") or 0,
        "humidity": r.get("hum") or 0,
        "mq135": mq135_val,
        "waterFlow": water_flw,
        "rssi": r.get("rssi") or 0,
        "hopCount": 1 if nid != 0 else 0,
        "parentNodeId": "0" if nid != 0 else None,
        "gatewayId": "gw-master",
        "packetLoss": 0,
        "lastSeen": ts_str,
        "battery": battery,
        "risk": "critical" if status == "critical" else ("medium" if status == "warning" else "low"),
        "tampered": False,
        "installedAt": "2026-01-01T00:00:00Z",
        "calibrationDueAt": "2026-12-01T00:00:00Z",
    }


def _master_is_online() -> bool:
    """
    Master (node 0) never inserts its own row — it only forwards slave packets.
    But if ANY slave reported data in the last 5 minutes, master MUST be online
    (slaves cannot reach the backend without master's WiFi uplink).
    """
    row = db.query_one(
        "SELECT 1 FROM readings WHERE node_id != 0 AND timestamp >= NOW() - INTERVAL '5 minutes' LIMIT 1"
    )
    return row is not None


@app.get("/api/nodes")
def get_nodes():
    # Fetch latest readings for nodes that have data
    latest = {r["node_id"]: r for r in latest_per_node()}

    # Master (node 0) is online if any slave reported in the last 5 minutes.
    # It never inserts its own row — it's a WiFi gateway, not a sensor node.
    master_online = _master_is_online()

    locations = {
        0: {"lat": 28.476502, "lng": 77.504466, "label": "Block A, Beta I, Greater Noida – Master Node"},
        1: {"lat": 28.477414, "lng": 77.503938, "label": "Block A, Beta I, Greater Noida"},
        2: {"lat": 28.478387, "lng": 77.504407, "label": "Block B, Beta I, Greater Noida"},
    }

    nodes = []
    for nid in [0, 1, 2]:

        # ── Node 0: master gateway ────────────────────────────────────
        if nid == 0:
            # Always show master — infer status from slave activity
            last_slave = db.query_one(
                "SELECT timestamp FROM readings WHERE node_id != 0 ORDER BY id DESC LIMIT 1"
            )
            ts_str = (
                last_slave["timestamp"].isoformat()
                if last_slave and hasattr(last_slave["timestamp"], "isoformat")
                else datetime.now(timezone.utc).isoformat()
            )
            nodes.append({
                "id": "0",
                "sector": get_sector_name(0),
                "status": "online" if master_online else "offline",
                "location": locations[0],
                "waterLevel": 0,
                "methaneLEL": 0.0,
                "h2sPpm": 0.0,
                "temperature": 0.0,
                "humidity": 0.0,
                "mq135": 400,
                "waterFlow": 0.0,
                "rssi": 0,
                "hopCount": 0,
                "parentNodeId": None,
                "gatewayId": "gw-master",
                "packetLoss": 0,
                "lastSeen": ts_str,
                "battery": 100.0,
                "risk": "low",
                "tampered": False,
                "installedAt": "2026-01-01T00:00:00Z",
                "calibrationDueAt": "2026-12-01T00:00:00Z",
            })
            continue

        # ── Slave nodes (1, 2, …) ─────────────────────────────────────
        if nid in latest:
            nodes.append(node_to_drain_node(latest[nid]))
        else:
            # Node has no recent data (or no data ever) → show as offline
            nodes.append({
                "id": str(nid),
                "sector": get_sector_name(nid),
                "status": "offline",
                "location": locations.get(nid, locations[1]),
                "waterLevel": 0, "methaneLEL": 0.0, "h2sPpm": 0.0,
                "temperature": 0.0, "humidity": 0.0, "mq135": 400,
                "waterFlow": 0.0, "rssi": 0,
                "hopCount": 1, "parentNodeId": "0",
                "gatewayId": "gw-master", "packetLoss": 100,
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "battery": 0.0, "risk": "low",
                "tampered": False,
                "installedAt": "2026-01-01T00:00:00Z",
                "calibrationDueAt": "2026-12-01T00:00:00Z",
            })

    return nodes



@app.get("/api/nodes/{node_id}")
def get_node(node_id: str):
    nid = 0 if node_id.lower() == "master" else int(node_id)
    row = db.query_one(
        "SELECT * FROM readings WHERE node_id=%s ORDER BY id DESC LIMIT 1",
        (nid,)
    )
    if not row:
        # Return default offline structure if no readings
        sector_name = get_sector_name(nid)
        locations = {
            0: {"lat": 28.476502, "lng": 77.504466, "label": "Block A, Beta I, Greater Noida – Master Node"},
            1: {"lat": 28.477414, "lng": 77.503938, "label": "Block A, Beta I, Greater Noida"},
            2: {"lat": 28.478387, "lng": 77.504407, "label": "Block B, Beta I, Greater Noida"},
        }
        return {
            "id": str(nid),
            "sector": sector_name,
            "status": "offline",
            "location": locations.get(nid, {"lat": 28.476502, "lng": 77.504466, "label": "Node"}),
            "waterLevel": 0,
            "methaneLEL": 0.0,
            "h2sPpm": 0.0,
            "temperature": 0.0,
            "humidity": 0.0,
            "mq135": 400,
            "waterFlow": 0.0,
            "rssi": 0,
            "hopCount": 1 if nid != 0 else 0,
            "parentNodeId": "0" if nid != 0 else None,
            "gatewayId": "gw-master",
            "packetLoss": 100,
            "lastSeen": datetime.now(timezone.utc).isoformat(),
            "battery": 0.0,
            "risk": "low",
            "tampered": False,
            "installedAt": "2026-01-01T00:00:00Z",
            "calibrationDueAt": "2026-12-01T00:00:00Z",
        }
    return node_to_drain_node(row)


@app.get("/api/nodes/{node_id}/readings")
def get_readings(node_id: str, hours: int = 24):
    nid = 0 if node_id.lower() == "master" else int(node_id)
    # Select up to 2000 chronological readings from the requested time period
    rows = db.query(
        f"SELECT * FROM readings WHERE node_id=%s AND timestamp >= NOW() - INTERVAL '{hours} hours' ORDER BY timestamp ASC LIMIT 2000",
        (nid,)
    )
    result = []
    for r in rows:
        ts = r.get("timestamp")
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        result.append({
            "nodeId": str(r["node_id"]),
            "timestamp": ts_str,
            "waterLevel": r.get("wlvl") or 0,
            "methaneLEL": norm_ch4(r.get("ch4") or 0),
            "h2sPpm":     norm_h2s(r.get("h2s") or 0),
            "temperature": r.get("temp") or 0,
            "humidity":    r.get("hum")  or 0,
            "mq135":       norm_mq135(r.get("mq135") or 0),
            "waterFlow": r.get("wflow") or 0.0,
            "rssi": r.get("rssi") or 0,
            "battery": r.get("battery") or 100.0
        })
    return result


@app.get("/api/alerts")
def get_alerts():
    alerts = []
    for r in latest_per_node():
        node_id = str(r["node_id"])
        ch4_lel   = norm_ch4(r.get("ch4") or 0)
        h2s_ppm   = norm_h2s(r.get("h2s") or 0)
        water_lvl = r.get("wlvl") or 0
        ts = r.get("timestamp")
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        sector = get_sector_name(r['node_id'])

        # ── Gas alerts ────────────────────────────────────────────
        if ch4_lel > 10:
            alert = {
                "id": f"ch4-{node_id}",
                "nodeId": node_id,
                "category": "gas",
                "severity": "critical" if ch4_lel > 20 else "warning",
                "title": "High Methane (CH4)",
                "message": f"CH4 at {ch4_lel:.1f}% LEL on Node {node_id}",
                "sector": sector,
                "value": ch4_lel, "unit": "% LEL", "threshold": 10,
                "timestamp": ts_str, "status": "active",
            }
            alerts.append(alert)
            tracking.maybe_create_incident_from_alert(alert)
        if h2s_ppm > 5:
            alert = {
                "id": f"h2s-{node_id}",
                "nodeId": node_id,
                "category": "gas",
                "severity": "critical" if h2s_ppm > 10 else "warning",
                "title": "High H2S",
                "message": f"H2S at {h2s_ppm:.1f} ppm on Node {node_id}",
                "sector": sector,
                "value": h2s_ppm, "unit": "ppm", "threshold": 5,
                "timestamp": ts_str, "status": "active",
            }
            alerts.append(alert)
            tracking.maybe_create_incident_from_alert(alert)

        # ── Water / flood alerts ──────────────────────────────────
        if water_lvl >= 100:
            alert = {
                "id": f"flood-{node_id}",
                "nodeId": node_id,
                "category": "flood",
                "severity": "critical",
                "title": "Drain Overflow",
                "message": f"Water level at {water_lvl}% (overflow) on Node {node_id}",
                "sector": sector,
                "value": water_lvl, "unit": "%", "threshold": 100,
                "timestamp": ts_str, "status": "active",
            }
            alerts.append(alert)
            tracking.maybe_create_incident_from_alert(alert)
        elif water_lvl > 75:
            alert = {
                "id": f"water-{node_id}",
                "nodeId": node_id,
                "category": "flood",
                "severity": "warning",
                "title": "High Water Level",
                "message": f"Water level at {water_lvl}% on Node {node_id}",
                "sector": sector,
                "value": water_lvl, "unit": "%", "threshold": 75,
                "timestamp": ts_str, "status": "active",
            }
            alerts.append(alert)
            tracking.maybe_create_incident_from_alert(alert)
    return alerts


@app.get("/api/incidents")
def list_incidents_api():
    return tracking.list_incidents()


@app.get("/api/incidents/{incident_id}")
def get_incident_api(incident_id: str):
    try:
        incident = tracking.get_incident_detail(int(incident_id))
    except ValueError:
        return JSONResponse({"detail": "Invalid incident id"}, status_code=400)
    if not incident:
        return JSONResponse({"detail": "Incident not found"}, status_code=404)
    return incident


@app.post("/api/incidents")
async def create_incident_api(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"detail": "Request body must be JSON"}, status_code=400)
    alert = payload.get("alert") if isinstance(payload, dict) else None
    if not alert:
        return JSONResponse({"detail": "alert payload required"}, status_code=400)
    incident = tracking.maybe_create_incident_from_alert(alert)
    if not incident:
        return JSONResponse({"detail": "Unable to create incident"}, status_code=500)
    return incident


@app.patch("/api/incidents/{incident_id}")
async def patch_incident_api(incident_id: str, request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"detail": "Request body must be JSON"}, status_code=400)
    try:
        updated = tracking.transition_incident_status(
            int(incident_id),
            str(payload.get("status", "DETECTED")),
            payload.get("message") or "Status updated by operator",
            actor_role=payload.get("actorRole") or "SYSTEM",
            metadata=payload.get("metadata") or {},
        )
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)
    return updated


@app.post("/api/incidents/{incident_id}/acknowledge")
def acknowledge_incident_api(incident_id: str):
    try:
        return tracking.transition_incident_status(int(incident_id), "ACKNOWLEDGED", "Worker acknowledged incident.", actor_role="FIELD_WORKER")
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.post("/api/incidents/{incident_id}/assign")
async def assign_incident_api(incident_id: str, request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"detail": "Request body must be JSON"}, status_code=400)
    return tracking.assign_incident(
        int(incident_id),
        authority_id=int(payload.get("authorityId") or 1),
        team_id=payload.get("teamId"),
        user_id=payload.get("userId"),
        assigned_by=payload.get("assignedBy"),
        reason=payload.get("reason") or "Assigned by operator",
    )


@app.post("/api/incidents/{incident_id}/start")
def start_incident_api(incident_id: str):
    try:
        return tracking.transition_incident_status(int(incident_id), "IN_PROGRESS", "Field response started.", actor_role="FIELD_WORKER")
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.post("/api/incidents/{incident_id}/on-site")
def on_site_incident_api(incident_id: str):
    try:
        return tracking.transition_incident_status(int(incident_id), "FIELD_VERIFICATION", "Worker verified field conditions on site.", actor_role="FIELD_WORKER")
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.post("/api/incidents/{incident_id}/resolve")
def resolve_incident_api(incident_id: str):
    try:
        return tracking.transition_incident_status(int(incident_id), "RESOLVED", "Response action completed and issue resolved.", actor_role="SUPERVISOR")
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.post("/api/incidents/{incident_id}/verify")
def verify_incident_api(incident_id: str):
    try:
        return tracking.transition_incident_status(int(incident_id), "VERIFIED", "Resolution was verified by supervisor.", actor_role="SUPERVISOR")
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.post("/api/incidents/{incident_id}/close")
def close_incident_api(incident_id: str):
    try:
        return tracking.transition_incident_status(int(incident_id), "CLOSED", "Incident closed after verification.", actor_role="SUPERVISOR")
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.post("/api/incidents/{incident_id}/escalate")
async def escalate_incident_api(incident_id: str, request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"detail": "Request body must be JSON"}, status_code=400)
    try:
        return tracking.transition_incident_status(
            int(incident_id),
            "ESCALATED",
            payload.get("message") or "Escalated to higher authority.",
            actor_role=payload.get("actorRole") or "MUNICIPAL_OPERATOR",
            metadata={"toRole": payload.get("toRole")},
        )
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)


@app.get("/api/incidents/{incident_id}/timeline")
def get_incident_timeline_api(incident_id: str):
    try:
        incident = tracking.get_incident_detail(int(incident_id))
    except ValueError:
        return JSONResponse({"detail": "Invalid incident id"}, status_code=400)
    if not incident:
        return JSONResponse({"detail": "Incident not found"}, status_code=404)
    return incident.get("events", [])


@app.get("/api/incidents/{incident_id}/evidence")
def get_incident_evidence_api(incident_id: str):
    try:
        incident = tracking.get_incident_detail(int(incident_id))
    except ValueError:
        return JSONResponse({"detail": "Invalid incident id"}, status_code=400)
    if not incident:
        return JSONResponse({"detail": "Incident not found"}, status_code=404)
    return incident.get("evidence", [])


@app.post("/api/incidents/{incident_id}/evidence")
async def create_incident_evidence_api(incident_id: str, request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"detail": "Request body must be JSON"}, status_code=400)
    try:
        evidence_record = tracking.create_evidence_record(
            int(incident_id),
            payload.get("type") or "NOTE",
            payload.get("url") or "/mock/evidence",
            payload.get("description") or "Field evidence captured",
            payload.get("uploadedBy") or "operator",
        )
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)
    return evidence_record


@app.get("/api/authorities")
def list_authorities_api():
    return tracking.get_authorities()


@app.get("/api/response-teams")
def list_response_teams_api():
    return tracking.get_response_teams()


@app.get("/api/notifications")
def list_notifications_api():
    return tracking.get_notifications()


@app.get("/api/escalation-rules")
def list_escalation_rules_api():
    return tracking.get_escalation_rules()


@app.get("/api/tracking/overview")
def tracking_overview_api():
    return tracking.get_tracking_overview()


@app.get("/api/tracking/map")
def tracking_map_api():
    return tracking.get_tracking_map()


@app.get("/api/tracking/statistics")
def tracking_statistics_api():
    return tracking.get_tracking_statistics()


@app.post("/api/alerts/{alert_id}/acknowledge")
def ack_alert(alert_id: str):
    return {"status": "acknowledged"}


@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    return {"status": "resolved"}


@app.get("/api/gateways")
def get_gateways():
    total = (db.query_one("SELECT COUNT(*) as cnt FROM readings") or {}).get("cnt", 0)
    
    latest = latest_per_node()
    max_ts = None
    for r in latest:
        ts = r.get("timestamp")
        if isinstance(ts, str):
            try: ts = datetime.fromisoformat(ts)
            except ValueError: pass
        if isinstance(ts, datetime):
            if max_ts is None or ts > max_ts:
                max_ts = ts
                
    now = datetime.now(timezone.utc)
    is_online = max_ts is not None and (now - max_ts).total_seconds() <= 300
    status = "online" if is_online else "offline"
    last_sync_str = max_ts.isoformat() if max_ts else now.isoformat()

    return [{
        "id": "gw-master",
        "label": "Master Gateway (ESP32 + SX1278 LoRa 433MHz)",
        "status": status,
        # Gateway co-located with Node 0 (Master) – Block A, Beta I, Greater Noida
        "location": {"lat": 28.476502, "lng": 77.504466, "label": "Block A, Beta I, Greater Noida – Gateway"},
        "connectedNodes": len(latest),
        "meshHealth": 95 if is_online else 0,
        "backhaul": "connected" if is_online else "disconnected",
        "backhaulType": "WiFi",
        "uptime": "N/A",
        "packetsReceived": total,
        "packetsForwarded": total,
        "packetLoss": 0,
        "cpuLoad": 10 if is_online else 0,
        "memoryLoad": 15 if is_online else 0,
        "lastSync": last_sync_str,
    }]


@app.get("/api/network/topology")
def get_topology():
    # Use get_nodes() so Network page and Overview are always consistent
    nodes = get_nodes()
    edges = [
        {
            "from": "gw-master",
            "to": n["id"],
            "rssi": n["rssi"],
            "hop": n["hopCount"],
            "packetStatus": "good" if n["status"] != "offline" else "lost"
        }
        for n in nodes
    ]
    return {"gateways": get_gateways(), "nodes": nodes, "edges": edges}



@app.get("/api/maintenance")
def get_maintenance():
    return []


@app.get("/api/events")
def get_events():
    rows = db.query("SELECT * FROM readings ORDER BY id DESC LIMIT 20")
    events = []
    for r in rows:
        ts = r.get("timestamp")
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        ch4_norm = norm_ch4(r.get('ch4') or 0)
        h2s_norm = norm_h2s(r.get('h2s') or 0)
        events.append({
            "id": str(r["id"]),
            "nodeId": str(r["node_id"]),
            "timestamp": ts_str,
            "message": f"Node {r['node_id']}: T={r.get('temp')}°C H={r.get('hum')}% CH4={ch4_norm}% LEL H2S={h2s_norm} ppm",
            "kind": "info",
        })
    return events


@app.get("/api/ml/predictions")
def get_predictions():
    predictions = []
    for r in latest_per_node():
        node_id = str(r["node_id"])
        # Use the same norm functions (with baseline=400) so fresh-air reads give 0 probability.
        # Without this, ADC=400 (clean air) would give ch4=9.8% and h2s=4.9 → medium risk always.
        ch4_lel = norm_ch4(r.get("ch4") or 0)   # 0.0–100.0 % LEL
        h2s_ppm = norm_h2s(r.get("h2s") or 0)   # 0.0–50.0 ppm
        water_lvl = r.get("wlvl") or 0
        # Weighted probability across all three sensors
        prob = min(1.0,
            (ch4_lel / 100.0 * 0.4) +
            (h2s_ppm / 50.0  * 0.35) +
            (water_lvl / 100.0 * 0.25)
        )
        risk = "critical" if prob > 0.6 else ("high" if prob > 0.4 else ("medium" if prob > 0.2 else "low"))
        factors = []
        if ch4_lel > 0:    factors.append(f"CH4 {ch4_lel:.1f}% LEL")
        if h2s_ppm > 0:    factors.append(f"H2S {h2s_ppm:.1f} ppm")
        if water_lvl > 50: factors.append(f"Water {water_lvl}%")
        if not factors:    factors = ["All sensors nominal"]
        predictions.append({
            "nodeId": node_id,
            "probability": round(prob, 2),
            "risk": risk,
            "confidence": 0.85,
            "factors": factors,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        })
    return predictions


# ──────────────────────────────────────────────
# DATABASE STATUS ENDPOINT
# ──────────────────────────────────────────────
@app.get("/api/db/status")
def get_db_status():
    return db.db_status()


# WebSocket telemetry — streams live node data every 1 second
@app.websocket("/ws/telemetry")
async def telemetry_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            nodes = get_nodes()
            await websocket.send_text(json.dumps(nodes))
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    print("=" * 50)
    print("  DrainWatch FastAPI Backend  (PostgreSQL + Supabase)")
    print("  http://0.0.0.0:3000")
    print("  ESP32 posts to: POST /lora-data")
    print("  DB status:      GET  /api/db/status")
    print("=" * 50)
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
