import { useMemo, useState } from "react";
import { Droplets, Flame, Wind, Thermometer, CloudDrizzle, Activity, CloudFog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { SensorChart } from "@/components/charts/SensorChart";
import { TimeRangeTabs, RANGES } from "@/components/ui/TimeRangeTabs";
import { useNodes, useSensorHistory } from "@/hooks/useDrainageData";
import { timeAgo } from "@/utils/format";
import { ErrorState } from "@/components/ui/Misc";

export default function LiveMonitoringPage() {
  const { nodes, error } = useNodes();
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [rangeKey, setRangeKey] = useState("6h");
  const hours = RANGES.find((r) => r.key === rangeKey)?.hours ?? 6;

  const node = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? nodes.find((n) => n.id !== "0") ?? nodes[0], [nodes, selectedNodeId]);
  const { history } = useSensorHistory(node?.id, hours);

  if (!node) {
    return (
      <AppShell title="Live Monitoring" subtitle="Real-time sensor telemetry">
        {error ? <ErrorState title="Telemetry unavailable" detail={error} /> : <p className="text-sm text-[var(--color-text-2)]">Loading telemetry…</p>}
      </AppShell>
    );
  }

  const sensorStatus = (v: number, warn: number, crit: number) => (v >= crit ? "critical" : v >= warn ? "warning" : "normal");

  return (
    <AppShell title="Live Monitoring" subtitle="Real-time sensor telemetry">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={node.id}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="mono rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-2.5 py-1.5 text-sm text-[var(--color-text-0)] focus:border-[var(--color-cyan)] focus:outline-none"
          >
            {nodes.filter(n => n.id !== "0").map((n) => (
              <option key={n.id} value={n.id}>
                Node {n.id}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--color-text-2)]">Last updated {timeAgo(node.lastSeen)}</span>
          <div className="ml-auto">
            <TimeRangeTabs value={rangeKey} onChange={(k) => setRangeKey(k)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SensorCard icon={Droplets} label="Water level" value={String(node.waterLevel)} unit="%" range="0–60%" status={sensorStatus(node.waterLevel, 65, 85)} updatedAgo={timeAgo(node.lastSeen)} />
          <SensorCard icon={Activity} label="Water flow" value={String(node.waterFlow)} unit="L/min" range="0–100 L/min" status="normal" updatedAgo={timeAgo(node.lastSeen)} />
          <SensorCard icon={Flame} label="CH4" value={String(node.methaneLEL)} unit="% LEL" range="0–3% LEL" status={sensorStatus(node.methaneLEL, 5, 7.5)} updatedAgo={timeAgo(node.lastSeen)} />
          <SensorCard icon={Wind} label="H2S" value={String(node.h2sPpm)} unit="ppm" range="0–6 ppm" status={sensorStatus(node.h2sPpm, 6, 10)} updatedAgo={timeAgo(node.lastSeen)} />
          <SensorCard icon={CloudFog} label="Air Quality (MQ135)" value={String(node.mq135)} unit="" range="0–4095" status={sensorStatus(node.mq135, 2000, 3000)} updatedAgo={timeAgo(node.lastSeen)} />
          <SensorCard icon={Thermometer} label="Temperature" value={String(node.temperature)} unit="°C" range="18–32°C" status="normal" updatedAgo={timeAgo(node.lastSeen)} />
          <SensorCard icon={CloudDrizzle} label="Humidity" value={String(node.humidity)} unit="%" range="40–95%" status="normal" updatedAgo={timeAgo(node.lastSeen)} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Water level over time</CardTitle></CardHeader>
            <CardContent>
              <SensorChart data={history} series={[{ key: "waterLevel", color: "#4dd6d1", label: "Water level", unit: "%" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Gas levels over time</CardTitle></CardHeader>
            <CardContent>
              <SensorChart
                data={history}
                series={[
                  { key: "methaneLEL", color: "#f0b13d", label: "CH4", unit: "% LEL" },
                  { key: "h2sPpm", color: "#ff5a5f", label: "H2S", unit: "ppm" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Temperature over time</CardTitle></CardHeader>
            <CardContent>
              <SensorChart data={history} series={[{ key: "temperature", color: "#4d9fff", label: "Temperature", unit: "°C" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Air Quality (MQ135) over time</CardTitle></CardHeader>
            <CardContent>
              <SensorChart data={history} series={[{ key: "mq135", color: "#b870ff", label: "Air Quality", unit: "" }]} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
