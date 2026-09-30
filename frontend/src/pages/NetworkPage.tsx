import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { GatewayCard } from "@/components/dashboard/GatewayCard";
import { NetworkTree } from "@/components/dashboard/NetworkTree";
import { ArchitectureDiagram } from "@/components/dashboard/ArchitectureDiagram";
import { useGateways, useNetworkTopology } from "@/hooks/useDrainageData";

export default function NetworkPage() {
  const gateways = useGateways();
  const topology = useNetworkTopology();

  const stats = useMemo(() => {
    if (!topology) return null;
    const online = topology.nodes.filter((n) => n.status !== "offline").length;
    const avgHops = topology.nodes.length
      ? topology.nodes.reduce((s, n) => s + n.hopCount, 0) / topology.nodes.length
      : 0;
    const goodEdges = topology.edges.filter((e) => e.packetStatus === "good").length;
    const delivery = topology.edges.length ? (goodEdges / topology.edges.length) * 100 : 0;
    const meshHealth = topology.gateways.length
      ? topology.gateways.reduce((s, g) => s + g.meshHealth, 0) / topology.gateways.length
      : 0;
    return {
      total: topology.nodes.length,
      online,
      offline: topology.nodes.length - online,
      gateways: topology.gateways.length,
      avgHops: avgHops.toFixed(1),
      delivery: delivery.toFixed(1),
      meshHealth: meshHealth.toFixed(1),
    };
  }, [topology]);

  return (
    <AppShell title="Network" subtitle="ESP-LoRa mesh topology and gateway health">
      <div className="space-y-5">
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: "Total nodes", value: stats.total },
              { label: "Online", value: stats.online },
              { label: "Offline", value: stats.offline },
              { label: "Gateways", value: stats.gateways },
              { label: "Avg hops", value: stats.avgHops },
              { label: "Packet delivery", value: `${stats.delivery}%` },
              { label: "Network health", value: `${stats.meshHealth}%` },
            ].map((s) => (
              <Card key={s.label} className="p-3.5">
                <p className="mono text-lg font-semibold text-[var(--color-text-0)]">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-2)]">{s.label}</p>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {gateways.map((g) => (
            <GatewayCard key={g.id} gateway={g} />
          ))}
        </div>

        {topology && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-0)]">Mesh topology by gateway</h3>
            {topology.gateways.map((g) => (
              <NetworkTree key={g.id} gateway={g} nodes={topology.nodes.filter((n) => n.gatewayId === g.id)} />
            ))}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Hardware connection architecture</CardTitle></CardHeader>
          <CardContent>
            <ArchitectureDiagram />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
