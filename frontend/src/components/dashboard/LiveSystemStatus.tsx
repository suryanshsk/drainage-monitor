import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LiveDot } from "@/components/ui/StatusBadge";
import { timeAgo } from "@/utils/format";
import { useGateways, useNodes } from "@/hooks/useDrainageData";

export function LiveSystemStatus() {
  const gateways = useGateways();
  const { nodes, error } = useNodes();
  const onlineNodes = nodes.filter((n) => n.status !== "offline").length;
  const primaryGateway = gateways[0];
  const lastSync = primaryGateway?.lastSync;

  const rows = [
    { label: "System status", value: error ? "Telemetry unavailable" : onlineNodes === 0 ? "Offline" : onlineNodes < nodes.length ? "Degraded" : "Operational", ok: !error },
    { label: "Network", value: error ? "Awaiting backend connection" : "ESP-LoRa Mesh Connected", ok: !error },
    { label: "Gateway", value: primaryGateway ? `${primaryGateway.id} ${primaryGateway.status}` : "Awaiting telemetry", ok: Boolean(primaryGateway) },
    { label: "Last sync", value: lastSync ? timeAgo(lastSync) : "—", ok: Boolean(lastSync) },
    { label: "Nodes", value: nodes.length ? `${onlineNodes} / ${nodes.length} Online` : "Awaiting telemetry", ok: nodes.length > 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live System Status</CardTitle>
        <LiveDot status={error ? "warning" : "online"} />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((r) => (
          <div key={r.label} className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-bg-1)] px-3 py-2.5">
            <p className="text-[11px] text-[var(--color-text-2)]">{r.label}</p>
            <p className="mono mt-1 text-sm font-medium text-[var(--color-text-0)]">{r.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
