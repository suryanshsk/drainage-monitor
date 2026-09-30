import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Activity,
  Map as MapIcon,
  CircuitBoard,
  BellRing,
  BarChart3,
  BrainCircuit,
  Network,
  Wrench,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGateways } from "@/hooks/useDrainageData";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/live", label: "Live Monitoring", icon: Activity },
  { to: "/map", label: "Drainage Map", icon: MapIcon },
  { to: "/nodes", label: "Nodes", icon: CircuitBoard },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/predictions", label: "AI Predictions", icon: BrainCircuit },
  { to: "/network", label: "Network", icon: Network },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/tracking", label: "Incident Tracking", icon: ShieldAlert },
  { to: "/settings", label: "System Settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const gateways = useGateways();
  const onlineGateways = gateways.filter((g) => g.status === "online").length;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[var(--color-line)] bg-[var(--color-bg-sidebar)] transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[236px]"
      )}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--color-line)] px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-cyan)]/15 text-[var(--color-cyan)]">
          <Droplets className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-[var(--color-text-0)]">DrainWatch</p>
            <p className="truncate text-[10px] text-[var(--color-text-2)]">Drainage Intelligence</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors relative overflow-hidden",
                isActive
                  ? "bg-[var(--color-cyan-dim)] text-[var(--color-cyan)] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[var(--color-cyan)]"
                  : "text-[var(--color-text-1)] hover:bg-[var(--color-bg-3)] hover:text-[var(--color-text-0)]"
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-line)] p-2.5">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md bg-[var(--color-bg-2)] px-2.5 py-2",
            collapsed && "justify-center"
          )}
        >
          <Radio className="h-3.5 w-3.5 shrink-0 text-[var(--color-ok)]" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-medium text-[var(--color-text-0)]">
                {gateways.length ? `${onlineGateways}/${gateways.length} Gateways online` : "Awaiting gateways"}
              </p>
              <p className="truncate text-[10px] text-[var(--color-text-2)]">
                {gateways.length ? "Mesh connected" : "Awaiting telemetry"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className={cn(
            "mt-2 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-[var(--color-text-2)] hover:bg-[var(--color-bg-3)] hover:text-[var(--color-text-0)]",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>

        <div className={cn("mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2", collapsed && "justify-center")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-3)] text-[11px] font-semibold text-[var(--color-text-0)]">
            OP
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-medium text-[var(--color-text-0)]">Operator</p>
              <p className="truncate text-[10px] text-[var(--color-text-2)]">Municipal Ops</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
