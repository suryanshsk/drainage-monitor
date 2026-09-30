import { useEffect, useState, type ReactNode } from "react";
import { Bell, RadioTower, RefreshCw } from "lucide-react";
import { formatClock, formatDate } from "@/utils/format";
import { useAlerts, useGateways } from "@/hooks/useDrainageData";

export function Header({
  title,
  subtitle,
  headerActions,
}: {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
}) {
  const [now, setNow] = useState(new Date());
  const gateways = useGateways();
  const { alerts } = useAlerts();
  const activeAlerts = alerts.filter((a) => a.status === "active").length;
  const allOnline = gateways.length > 0 && gateways.every((g) => g.status === "online");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-bg-1)]/80 px-5 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-[var(--color-text-0)]">{title}</h1>
        {subtitle && <p className="truncate text-xs text-[var(--color-text-2)]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {headerActions}
        <div className="hidden items-center gap-1.5 text-xs text-[var(--color-text-2)] md:flex">
          <RefreshCw className="h-3 w-3 animate-spin text-[var(--color-cyan)]" style={{ animationDuration: "3s" }} />
          <span className="mono">{formatClock(now)}</span>
          <span className="text-[var(--color-line)]">·</span>
          <span>{formatDate(now)}</span>
        </div>

        <div className={`hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs sm:flex ${gateways.length === 0 ? "bg-[var(--color-warn-dim)] border-[var(--color-warn)]/20" : allOnline ? "bg-[var(--color-ok-dim)] border-[var(--color-ok)]/20" : "bg-[var(--color-crit-dim)] border-[var(--color-crit)]/20"}`}>
          <RadioTower className={`h-3.5 w-3.5 ${gateways.length === 0 ? "text-[var(--color-warn)]" : allOnline ? "text-[var(--color-ok)]" : "text-[var(--color-crit)]"}`} />
          <span className={gateways.length === 0 ? "text-[var(--color-warn)] font-medium" : allOnline ? "text-[var(--color-ok)] font-medium" : "text-[var(--color-crit)] font-medium"}>{gateways.length === 0 ? "Awaiting telemetry" : allOnline ? "All gateways online" : "Gateway degraded"}</span>
        </div>

        <button className="relative rounded-md p-1.5 text-[var(--color-text-1)] hover:bg-[var(--color-bg-3)] hover:text-[var(--color-text-0)]">
          <Bell className="h-4 w-4" />
          {activeAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-crit)] px-1 text-[10px] font-semibold text-[#2a0507]">
              {activeAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
