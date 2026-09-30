import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Droplets, Flame, Wind, Thermometer, CloudDrizzle, Activity, CloudFog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBadge, RiskBadge } from "@/components/ui/StatusBadge";
import { SensorChart } from "@/components/charts/SensorChart";
import { TimeRangeTabs, RANGES } from "@/components/ui/TimeRangeTabs";
import { SimulationControl } from "@/components/dashboard/SimulationControl";
import { useState } from "react";
import { useNode, useSensorHistory, useSystemEvents } from "@/hooks/useDrainageData";
import { timeAgo } from "@/utils/format";

const readouts = [
  { key: "waterLevel", label: "Water level", unit: "%", icon: Droplets },
  { key: "waterFlow", label: "Water flow", unit: "L/min", icon: Activity },
  { key: "methaneLEL", label: "CH4", unit: "% LEL", icon: Flame },
  { key: "h2sPpm", label: "H2S", unit: "ppm", icon: Wind },
  { key: "mq135", label: "Air Quality (MQ135)", unit: "ADC", icon: CloudFog },
  { key: "temperature", label: "Temperature", unit: "°C", icon: Thermometer },
  { key: "humidity", label: "Humidity", unit: "%", icon: CloudDrizzle },
] as const;

export default function NodeDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const node = useNode(nodeId);
  const events = useSystemEvents();
  const [rangeKey, setRangeKey] = useState("24h");
  const hours = RANGES.find((r) => r.key === rangeKey)?.hours ?? 24;
  const { history } = useSensorHistory(node?.id, hours);

  if (!node) {
    return (
      <AppShell title="Node detail">
        <p className="text-sm text-[var(--color-text-2)]">Loading node…</p>
      </AppShell>
    );
  }

  const nodeEvents = events.filter((e) => e.nodeId === node.id);

  return (
    <AppShell title={node.id} subtitle={node.location.label}>
      <div className="space-y-5">
        <Link to="/nodes" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-2)] hover:text-[var(--color-text-0)]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to nodes
        </Link>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mono text-lg font-semibold text-[var(--color-text-0)]">{node.id}</h2>
            <StatusBadge status={node.status} />
            <RiskBadge risk={node.risk} />
            {node.tampered && <span className="rounded bg-[#241633] px-2 py-0.5 text-xs font-semibold text-[#c78bff]">TAMPER FLAGGED</span>}
            <span className="ml-auto text-xs text-[var(--color-text-2)]">Last seen {timeAgo(node.lastSeen)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Location", value: node.location.label },
              { label: "Gateway", value: node.gatewayId },
              { label: "Hop count", value: String(node.hopCount) },
              { label: "RSSI", value: `${node.rssi} dBm` },
            ].map((r) => (
              <div key={r.label} className="rounded-md bg-[var(--color-bg-1)] px-3 py-2">
                <p className="text-[10px] text-[var(--color-text-2)]">{r.label}</p>
                <p className="mono mt-0.5 truncate text-sm font-medium text-[var(--color-text-0)]">{r.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-0)]">Sensor overview</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {readouts.map((r) => (
              <Card key={r.key} className="p-3.5">
                <div className="flex items-center gap-1.5 text-[var(--color-text-2)]">
                  <r.icon className="h-3.5 w-3.5" />
                  <p className="text-[11px] font-medium uppercase tracking-wide">{r.label}</p>
                </div>
                <p className="mono mt-1.5 text-lg font-semibold text-[var(--color-text-0)]">
                  {node[r.key]}
                  <span className="ml-1 text-xs font-normal text-[var(--color-text-2)]">{r.unit}</span>
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-0)]">Historical charts</h3>
          <TimeRangeTabs value={rangeKey} onChange={(k) => setRangeKey(k)} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Water level</CardTitle></CardHeader>
            <CardContent><SensorChart data={history} hours={hours} series={[{ key: "waterLevel", color: "#4dd6d1", label: "Water level", unit: "%" }]} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Gas levels</CardTitle></CardHeader>
            <CardContent>
              <SensorChart data={history} hours={hours} series={[
                { key: "methaneLEL", color: "#f0b13d", label: "CH4", unit: "% LEL" },
                { key: "h2sPpm", color: "#ff5a5f", label: "H2S", unit: "ppm" },
              ]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Temperature</CardTitle></CardHeader>
            <CardContent><SensorChart data={history} hours={hours} series={[{ key: "temperature", color: "#4d9fff", label: "Temperature", unit: "°C" }]} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Air Quality (MQ135)</CardTitle></CardHeader>
            <CardContent><SensorChart data={history} hours={hours} series={[{ key: "mq135", color: "#b870ff", label: "MQ135", unit: "ADC" }]} /></CardContent>
          </Card>
        </div>


        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Network information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: "Parent node", value: node.parentNodeId ?? "— (root)" },
                { label: "Next hop", value: node.parentNodeId ?? node.gatewayId },
                { label: "Hop count", value: String(node.hopCount) },
                { label: "RSSI", value: `${node.rssi} dBm` },
                { label: "Packet loss", value: `${node.packetLoss}%` },
                { label: "Gateway", value: node.gatewayId },
                { label: "Installed", value: new Date(node.installedAt).toLocaleDateString("en-IN") },
                { label: "Calibration due", value: new Date(node.calibrationDueAt).toLocaleDateString("en-IN") },
              ].map((r) => (
                <div key={r.label} className="rounded-md bg-[var(--color-bg-1)] px-3 py-2">
                  <p className="text-[10px] text-[var(--color-text-2)]">{r.label}</p>
                  <p className="mono mt-0.5 text-sm font-medium text-[var(--color-text-0)]">{r.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <SimulationControl nodeId={node.id} />
        </div>

        <Card>
          <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
          <CardContent>
            {nodeEvents.length === 0 ? (
              <p className="text-xs text-[var(--color-text-2)]">No recent events logged for this node in the demo window.</p>
            ) : (
              <ul className="space-y-2">
                {nodeEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-1)]">{e.message}</span>
                    <span className="mono text-[var(--color-text-2)]">{timeAgo(e.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
