import { useMemo } from "react";
import { CircuitBoard, Wifi, BellRing, AlertTriangle, Droplets, Activity, Radio, BrainCircuit } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LiveSystemStatus } from "@/components/dashboard/LiveSystemStatus";
import { AlertCard } from "@/components/alerts/AlertCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/Misc";
import { useNodes, useAlerts, useGateways } from "@/hooks/useDrainageData";
import { usePredictions } from "@/hooks/useDrainageData";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function OverviewPage() {
  const { nodes, loading, error } = useNodes();
  const { alerts, acknowledge, resolve } = useAlerts();
  const gateways = useGateways();
  const { predictions } = usePredictions();

  const stats = useMemo(() => {
    const online = nodes.filter((n) => n.status !== "offline").length;
    const critical = nodes.filter((n) => n.status === "critical").length;
    const activeAlerts = alerts.filter((a) => a.status === "active").length;
    const avgWater = nodes.length ? nodes.reduce((s, n) => s + n.waterLevel, 0) / nodes.length : 0;
    const gwOnline = gateways.filter((g) => g.status === "online").length;
    const meshHealth = gateways.length ? gateways.reduce((s, g) => s + g.meshHealth, 0) / gateways.length : 0;
    const highRiskPredictions = predictions.filter((p) => p.risk === "high" || p.risk === "critical").length;
    return { online, critical, activeAlerts, avgWater, gwOnline, meshHealth, highRiskPredictions };
  }, [nodes, alerts, gateways, predictions]);

  const topAlerts = alerts.filter((a) => a.status === "active").slice(0, 4);

  return (
    <AppShell title="Drainage Monitoring" subtitle="Real-time underground infrastructure intelligence">
      <div className="space-y-5">
        {loading ? (
          <LoadingState rows={2} />
        ) : error ? (
          <ErrorState title="Telemetry unavailable" detail={error} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <KpiCard icon={CircuitBoard} label="Total nodes" value={String(nodes.length)} accent="default" />
            <KpiCard icon={Wifi} label="Online nodes" value={String(stats.online)} accent="ok" />
            <KpiCard icon={BellRing} label="Active alerts" value={String(stats.activeAlerts)} accent="warn" />
            <KpiCard icon={AlertTriangle} label="Critical nodes" value={String(stats.critical)} accent="crit" />
            <KpiCard icon={Droplets} label="Avg water level" value={stats.avgWater.toFixed(0)} suffix="%" accent="cyan" />
            <KpiCard icon={Radio} label="Gateway status" value={stats.gwOnline === 0 ? "OFFLINE" : stats.gwOnline === gateways.length ? "ONLINE" : "DEGRADED"} accent={stats.gwOnline === 0 ? "crit" : stats.gwOnline === gateways.length ? "ok" : "warn"} />
            <KpiCard icon={BrainCircuit} label="Predicted blockages" value={String(stats.highRiskPredictions)} accent="crit" />
          </div>
        )}

        <LiveSystemStatus />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <Link to="/alerts">
                <Button size="sm" variant="ghost">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {topAlerts.length === 0 ? (
                <EmptyState title="No active alerts" detail="Alerts will appear when the backend reports them." />
              ) : (
                topAlerts.map((a) => (
                  <AlertCard key={a.id} alert={a} onAcknowledge={acknowledge} onResolve={resolve} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sector Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(
                nodes.reduce<Record<string, { total: number; alert: number }>>((acc, n) => {
                  acc[n.sector] = acc[n.sector] ?? { total: 0, alert: 0 };
                  acc[n.sector].total++;
                  if (n.status !== "online") acc[n.sector].alert++;
                  return acc;
                }, {})
              ).map(([sector, v]) => (
                <div key={sector} className="flex items-center justify-between rounded-md bg-[var(--color-bg-1)] px-3 py-2 text-xs">
                  <span className="truncate pr-2 text-[var(--color-text-1)]">{sector}</span>
                  <span className="mono shrink-0 text-[var(--color-text-2)]">
                    {v.total - v.alert}/{v.total} online
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
