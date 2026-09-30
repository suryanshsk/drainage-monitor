import { ApiClient } from "@/services/api/ApiClient";
import {
  mockAuthorities,
  mockEscalationRules,
  mockIncidents,
  mockMapMarkers,
  mockNotifications,
  mockResponseTeams,
  mockTrackingOverview,
  mockTrackingStatistics,
} from "@/data/mockTracking";
import type {
  Authority,
  EscalationRule,
  Incident,
  NotificationEvent,
  ResponseTeam,
  TrackingMapMarker,
  TrackingOverview,
  TrackingStatistics,
} from "@/types";

export class TrackingAdapter {
  private readonly api: ApiClient;

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? "/api") {
    this.api = new ApiClient(baseUrl);
  }

  private async safeCall<T>(fallback: T, request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch {
      return fallback;
    }
  }

  getOverview() {
    return this.safeCall<TrackingOverview>(mockTrackingOverview, () => this.api.get<TrackingOverview>("/tracking/overview"));
  }

  getIncidents() {
    return this.safeCall<Incident[]>(mockIncidents, () => this.api.get<Incident[]>("/incidents"));
  }

  getIncident(incidentId: string) {
    return this.safeCall<Incident | null>(
      mockIncidents.find((incident) => String(incident.id) === String(incidentId)) ?? null,
      () => this.api.get<Incident>(`/incidents/${encodeURIComponent(incidentId)}`)
    );
  }

  getTrackingMap() {
    return this.safeCall<TrackingMapMarker[]>(mockMapMarkers, () => this.api.get<TrackingMapMarker[]>("/tracking/map"));
  }

  getStatistics() {
    return this.safeCall<TrackingStatistics>(mockTrackingStatistics, () => this.api.get<TrackingStatistics>("/tracking/statistics"));
  }

  getAuthorities() {
    return this.safeCall<Authority[]>(mockAuthorities, () => this.api.get<Authority[]>("/authorities"));
  }

  getResponseTeams() {
    return this.safeCall<ResponseTeam[]>(mockResponseTeams, () => this.api.get<ResponseTeam[]>("/response-teams"));
  }

  getNotifications() {
    return this.safeCall<NotificationEvent[]>(mockNotifications, () => this.api.get<NotificationEvent[]>("/notifications"));
  }

  getEscalationRules() {
    return this.safeCall<EscalationRule[]>(mockEscalationRules, () => this.api.get<EscalationRule[]>("/escalation-rules"));
  }
}

export const trackingAdapter = new TrackingAdapter();
