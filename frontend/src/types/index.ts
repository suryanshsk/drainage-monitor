// ─────────────────────────────────────────────────────────────────────────
// Core domain types. These mirror the JSON shape the future backend API
// (REST/WebSocket) is expected to return, so swapping MockHardwareAdapter
// for a real ApiHardwareAdapter requires no changes to components.
// ─────────────────────────────────────────────────────────────────────────

export type NodeStatus = "online" | "warning" | "critical" | "offline";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AlertSeverity = "info" | "warning" | "critical" | "tamper";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertCategory =
  | "gas"
  | "flood"
  | "tamper"
  | "network"
  | "battery"
  | "blockage";

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface DrainNode {
  id: string;
  sector: string;
  status: NodeStatus;
  location: GeoPoint;
  waterLevel: number; // %
  methaneLEL: number; // % LEL
  h2sPpm: number; // ppm
  temperature: number; // °C
  humidity: number; // %
  pressure: number; // hPa
  tilt: number; // degrees
  battery: number; // %
  mq135: number; // Air Quality (ADC/ppm)
  waterFlow: number; // L/min
  rssi: number; // dBm
  hopCount: number;
  parentNodeId: string | null;
  gatewayId: string;
  packetLoss: number; // %
  lastSeen: string; // ISO timestamp
  risk: RiskLevel;
  tampered: boolean;
  installedAt: string;
  calibrationDueAt: string;
}

export interface SensorReading {
  nodeId: string;
  timestamp: string;
  waterLevel: number;
  methaneLEL: number;
  h2sPpm: number;
  temperature: number;
  humidity: number;
  pressure: number;
  tilt: number;
  battery: number;
  mq135: number;
  waterFlow: number;
  rssi: number;
}

export interface Alert {
  id: string;
  nodeId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  sector: string;
  value?: number;
  unit?: string;
  threshold?: number;
  timestamp: string;
  status: AlertStatus;
}

export interface Prediction {
  nodeId: string;
  probability: number; // 0-1
  risk: RiskLevel;
  predictedWindow?: string;
  confidence: number; // 0-1
  factors: string[];
  generatedAt: string;
}

export interface Gateway {
  id: string;
  label: string;
  status: "online" | "offline" | "degraded";
  location: GeoPoint;
  connectedNodes: number;
  meshHealth: number; // %
  backhaul: "connected" | "degraded" | "disconnected";
  backhaulType: string;
  uptime: string;
  packetsReceived: number;
  packetsForwarded: number;
  packetLoss: number;
  cpuLoad: number;
  memoryLoad: number;
  lastSync: string;
}

export interface MaintenanceTask {
  id: string;
  nodeId: string;
  type:
    | "calibration"
    | "battery"
    | "signal"
    | "repeated_alert"
    | "physical_inspection";
  title: string;
  detail: string;
  dueLabel: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

export interface NetworkEdge {
  from: string; // gateway or node id
  to: string; // node id
  rssi: number;
  hop: number;
  packetStatus: "good" | "degraded" | "lost";
}

export interface NetworkTopology {
  gateways: Gateway[];
  nodes: DrainNode[];
  edges: NetworkEdge[];
}

export interface SystemEvent {
  id: string;
  nodeId?: string;
  timestamp: string;
  message: string;
  kind: "info" | "warning" | "critical";
}

export type AuthorityType = "FIELD_TEAM" | "MUNICIPAL" | "REGIONAL" | "STATE" | "CENTRAL" | "OVERSIGHT";
export type AuthorityRole = "FIELD_WORKER" | "SUPERVISOR" | "MUNICIPAL_OPERATOR" | "REGIONAL_OPERATOR" | "STATE_OPERATOR" | "CENTRAL_OPERATOR" | "OVERSIGHT" | "ADMIN";
export type IncidentPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "DETECTED" | "TRIAGED" | "ASSIGNED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "FIELD_VERIFICATION" | "PRE_SOLVED" | "RESOLVED" | "VERIFIED" | "CLOSED" | "ESCALATED" | "REOPENED" | "CANCELLED";
export type IncidentCategory = "WATER_LEVEL" | "FLOOD_RISK" | "BLOCKAGE" | "METHANE" | "H2S" | "AIR_QUALITY" | "SENSOR_FAILURE" | "GATEWAY_FAILURE" | "TAMPER" | "BATTERY" | "COMMUNICATION_FAILURE" | "PREDICTIVE_RISK" | "MAINTENANCE" | "OTHER";
export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "SYSTEM";
export type NotificationStatus = "QUEUED" | "SENT" | "DELIVERED" | "ACKNOWLEDGED" | "FAILED";
export type SlaStatus = "WITHIN_SLA" | "AT_RISK" | "BREACHED";

export interface Authority {
  id: number;
  name: string;
  type: AuthorityType;
  level: number;
  parent_id?: number | null;
  jurisdiction?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  active: boolean;
  created_at: string;
}

export interface ResponseTeam {
  id: number;
  name: string;
  authority_id?: number | null;
  team_type: string;
  contact?: string | null;
  active: boolean;
  created_at: string;
}

export interface IncidentEvent {
  id: number;
  incident_id: number;
  event_type: string;
  actor_id?: number | null;
  actor_role?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface IncidentAssignment {
  id: number;
  incident_id: number;
  authority_id?: number | null;
  team_id?: number | null;
  user_id?: number | null;
  assigned_by?: number | null;
  assigned_at: string;
  unassigned_at?: string | null;
  reason?: string | null;
}

export interface NotificationEvent {
  id: number;
  incident_id: number;
  recipient_id?: number | null;
  recipient_role?: string | null;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  sent_at?: string | null;
  delivered_at?: string | null;
  acknowledged_at?: string | null;
  error?: string | null;
  created_at: string;
}

export interface IncidentEvidence {
  id: number;
  incident_id: number;
  uploaded_by?: string | null;
  type: "PHOTO" | "VIDEO" | "DOCUMENT" | "NOTE" | "SENSOR_SNAPSHOT";
  url?: string | null;
  description?: string | null;
  created_at: string;
}

export interface EscalationRule {
  id: number;
  name: string;
  priority: IncidentPriority;
  after_minutes: number;
  from_role?: string | null;
  to_role?: string | null;
  enabled: boolean;
  created_at: string;
}

export interface OfficialResolutionDocument {
  id: number;
  document_type: "FIELD_REPORT" | "PHOTO_EVIDENCE" | "CLEANING_CERTIFICATE" | "FLOW_RESTORE_CHECK" | "CLOSURE_MEMO" | "GOVT_APPROVAL";
  title: string;
  submitted_by: string;
  submitted_by_role: string;
  submitted_at: string;
  status: "PENDING" | "VERIFIED" | "APPROVED" | "REJECTED";
  file_name?: string | null;
  notes?: string | null;
}

export interface GovernmentVerification {
  reviewed_by: string;
  designation: string;
  department: string;
  verified_at?: string | null;
  verification_notes: string;
  official_resolution_status: "PENDING" | "PRE_SOLVED" | "OFFICIALLY_RESOLVED" | "REJECTED";
  certificate_number?: string | null;
}

export interface Incident {
  id: number;
  incident_number: string;
  alert_id?: string | null;
  node_id?: number | null;
  gateway_id?: string | null;
  authority_id?: number | null;
  assigned_team_id?: number | null;
  assigned_user_id?: number | null;
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description?: string | null;
  department_name?: string | null;
  ministry_name?: string | null;
  assigned_team_name?: string | null;
  assigned_department?: string | null;
  resolution_summary?: string | null;
  resolution_method?: string | null;
  next_step?: string | null;
  official_documents?: OfficialResolutionDocument[];
  government_verification?: GovernmentVerification | null;
  latitude?: number | null;
  longitude?: number | null;
  sector?: string | null;
  detected_at: string;
  triaged_at?: string | null;
  assigned_at?: string | null;
  acknowledged_at?: string | null;
  started_at?: string | null;
  resolved_at?: string | null;
  verified_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  events?: IncidentEvent[];
  notifications?: NotificationEvent[];
  evidence?: IncidentEvidence[];
  assignments?: IncidentAssignment[];
}

export interface TrackingOverview {
  total_incidents: number;
  active_incidents: number;
  critical: number;
  awaiting_acknowledgement: number;
  in_response: number;
  escalated: number;
  resolved_today: number;
  pre_solved: number;
}

export interface TrackingMapMarker {
  id: number;
  incidentNumber: string;
  nodeId: number;
  priority: IncidentPriority;
  status: IncidentStatus;
  sector: string;
  latitude: number;
  longitude: number;
}

export interface TrackingStatistics {
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  criticalRate: number;
  resolvedRate: number;
}

export type SimulationScenario =
  | "normal"
  | "heavy_rain"
  | "rising_water"
  | "blockage"
  | "gas_alert"
  | "tamper"
  | "gateway_offline";

export interface ThresholdConfig {
  waterWarning: number;
  waterCritical: number;
  ch4Warning: number;
  ch4Critical: number;
  h2sWarning: number;
  h2sCritical: number;
  simulationSpeed: number; // 1x, 2x, 4x
}
