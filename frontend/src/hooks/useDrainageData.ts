import { useCallback, useEffect, useState } from "react";
import { hardwareAdapter } from "@/services/hardware";
import { mlAdapter } from "@/services/ml";
import { trackingAdapter } from "@/services/tracking";
import type {
  DrainNode,
  Alert,
  Gateway,
  NetworkTopology,
  MaintenanceTask,
  SystemEvent,
  Prediction,
  SensorReading,
  Incident,
  TrackingOverview,
  TrackingMapMarker,
  TrackingStatistics,
  Authority,
  ResponseTeam,
  NotificationEvent,
  EscalationRule,
} from "@/types";

/** All live nodes, kept fresh via the hardware adapter's simulated stream. */
export function useNodes(live = true) {
  const [nodes, setNodes] = useState<DrainNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Immediately fetch via REST and mark loading done
    hardwareAdapter.getNodes().then((n) => {
      if (mounted) {
        setNodes(n);
        setError(null);
        setLoading(false);
      }
    }).catch((reason: unknown) => {
      if (mounted) {
        setError(reason instanceof Error ? reason.message : "Unable to load node telemetry.");
        setLoading(false);
      }
    });

    // Subscribe to live updates (WebSocket) — updates nodes but never blocks loading
    if (!live) return () => { mounted = false; };
    const unsub = hardwareAdapter.subscribeToLiveData((n) => {
      if (mounted) setNodes(n);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [live]);

  return { nodes, loading, error };
}


export function useNode(nodeId: string | undefined) {
  const { nodes } = useNodes(true);
  const [fallback, setFallback] = useState<{ nodeId: string; node?: DrainNode } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!nodeId) return () => { mounted = false; };
    hardwareAdapter.getNode(nodeId).then((nextNode) => {
      if (mounted) setFallback({ nodeId, node: nextNode });
    });
    return () => { mounted = false; };
  }, [nodeId]);

  const fallbackNode = fallback && fallback.nodeId === nodeId ? fallback.node : undefined;
  const node = nodes.find((n) => n.id === nodeId) ?? fallbackNode;
  return node;
}

export function useSensorHistory(nodeId: string | undefined, hours: number) {
  const requestKey = `${nodeId ?? ""}:${hours}`;
  const [result, setResult] = useState<{ key: string; history: SensorReading[] }>({ key: "", history: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!nodeId) return () => { mounted = false; };
    hardwareAdapter.getSensorHistory(nodeId, hours).then((h) => {
      if (mounted) {
        setResult({ key: requestKey, history: h });
        setError(null);
      }
    }).catch((reason: unknown) => {
      if (mounted) setError(reason instanceof Error ? reason.message : "Unable to load sensor history.");
    });
    return () => { mounted = false; };
  }, [nodeId, hours, requestKey]);

  return {
    history: result.key === requestKey ? result.history : [],
    loading: Boolean(nodeId) && result.key !== requestKey,
    error,
  };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    hardwareAdapter.getAlerts().then((a) => {
      setAlerts(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const unsub = hardwareAdapter.subscribeToLiveData(() => refresh());
    return unsub;
  }, [refresh]);

  const acknowledge = useCallback(
    async (id: string) => {
      await hardwareAdapter.acknowledgeAlert(id);
      refresh();
    },
    [refresh]
  );
  const resolve = useCallback(
    async (id: string) => {
      await hardwareAdapter.resolveAlert(id);
      refresh();
    },
    [refresh]
  );

  return { alerts, loading, acknowledge, resolve, refresh };
}

export function useGateways() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  useEffect(() => {
    let mounted = true;
    const refresh = () => hardwareAdapter.getGateways().then((nextGateways) => {
      if (mounted) setGateways(nextGateways);
    }).catch(() => undefined);
    refresh();
    const unsub = hardwareAdapter.subscribeToLiveData(refresh);
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  return gateways;
}

export function useNetworkTopology() {
  const [topology, setTopology] = useState<NetworkTopology | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = () => hardwareAdapter.getNetworkTopology().then((t) => mounted && setTopology(t)).catch(() => undefined);
    load();
    const unsub = hardwareAdapter.subscribeToLiveData(() => load());
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  return topology;
}

export function useMaintenanceTasks() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  useEffect(() => {
    hardwareAdapter.getMaintenanceTasks().then(setTasks).catch(() => undefined);
  }, []);
  return tasks;
}

export function useSystemEvents() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  useEffect(() => {
    hardwareAdapter.getSystemEvents().then(setEvents).catch(() => undefined);
  }, []);
  return events;
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    mlAdapter.getPredictions().then((p) => {
      setPredictions(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  return { predictions, loading };
}

export function useTrackingOverview() {
  const [overview, setOverview] = useState<TrackingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    trackingAdapter.getOverview().then((next) => {
      setOverview(next);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  return { overview, loading };
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    trackingAdapter.getIncidents().then((next) => {
      setIncidents(next);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  return { incidents, loading };
}

export function useIncidentDetail(incidentId: string | undefined) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(Boolean(incidentId));
  useEffect(() => {
    if (!incidentId) {
      setIncident(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    trackingAdapter.getIncident(incidentId).then((next) => {
      setIncident(next);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [incidentId]);
  return { incident, loading };
}

export function useTrackingMap() {
  const [markers, setMarkers] = useState<TrackingMapMarker[]>([]);
  useEffect(() => {
    trackingAdapter.getTrackingMap().then(setMarkers).catch(() => setMarkers([]));
  }, []);
  return markers;
}

export function useTrackingStatistics() {
  const [stats, setStats] = useState<TrackingStatistics | null>(null);
  useEffect(() => {
    trackingAdapter.getStatistics().then(setStats).catch(() => setStats(null));
  }, []);
  return stats;
}

export function useAuthorities() {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  useEffect(() => {
    trackingAdapter.getAuthorities().then(setAuthorities).catch(() => setAuthorities([]));
  }, []);
  return authorities;
}

export function useResponseTeams() {
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  useEffect(() => {
    trackingAdapter.getResponseTeams().then(setTeams).catch(() => setTeams([]));
  }, []);
  return teams;
}

export function useNotifications() {
  const [data, setData] = useState<NotificationEvent[]>([]);
  useEffect(() => {
    trackingAdapter.getNotifications().then(setData).catch(() => setData([]));
  }, []);
  return data;
}

export function useEscalationRules() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  useEffect(() => {
    trackingAdapter.getEscalationRules().then(setRules).catch(() => setRules([]));
  }, []);
  return rules;
}
