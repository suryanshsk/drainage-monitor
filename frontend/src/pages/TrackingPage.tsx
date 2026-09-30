import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, ShieldAlert, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { IncidentQueue } from "@/components/tracking/IncidentQueue";
import { TrackingKpiCards } from "@/components/tracking/TrackingKpiCards";
import { AuthorityChain } from "@/components/tracking/AuthorityChain";
import { useIncidents, useTrackingOverview, useTrackingStatistics } from "@/hooks/useDrainageData";

export default function TrackingPage() {
  const { overview, loading: overviewLoading } = useTrackingOverview();
  const { incidents, loading: incidentsLoading } = useIncidents();
  const stats = useTrackingStatistics();

  const cards = [
    {
      label: "Total incidents",
      value: overview ? String(overview.total_incidents) : "--",
      helper: "Across all active sectors",
      icon: AlertTriangle,
      accent: "cyan" as const,
    },
    {
      label: "Critical",
      value: overview ? String(overview.critical) : "--",
      helper: "High-priority escalations",
      icon: ShieldAlert,
      accent: "crit" as const,
    },
    {
      label: "Awaiting ack",
      value: overview ? String(overview.awaiting_acknowledgement) : "--",
      helper: "Pending operator response",
      icon: Clock3,
      accent: "warn" as const,
    },
    {
      label: "Pre-solved",
      value: overview ? String(overview.pre_solved ?? 0) : "--",
      helper: "Final verification in progress",
      icon: CheckCircle2,
      accent: "ok" as const,
    },
    {
      label: "Resolved today",
      value: overview ? String(overview.resolved_today) : "--",
      helper: "Closed within SLA",
      icon: CheckCircle2,
      accent: "ok" as const,
    },
  ];

  return (
    <AppShell title="Incident Tracking" subtitle="Citywide response monitoring and escalation" headerActions={
      <Link to="/alerts" className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cyan)] px-3 py-2 text-sm font-medium text-[var(--color-bg-1)] hover:opacity-90">
        <BellRing className="h-4 w-4" />
        View alerts
      </Link>
    }>
      <div className="space-y-5">
        {overviewLoading || incidentsLoading ? (
          <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] p-10 text-center text-sm text-[var(--color-text-2)]">
            Loading incident data…
          </div>
        ) : (
          <>
            <TrackingKpiCards items={cards} />

            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <IncidentQueue incidents={incidents} />

              <div className="space-y-5">
                <AuthorityChain />
                <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-0)]">Live response mix</p>
                    <Users className="h-4 w-4 text-[var(--color-cyan)]" />
                  </div>
                  <div className="space-y-3 text-sm text-[var(--color-text-1)]">
                    <div className="flex items-center justify-between">
                      <span>Critical network alerts</span>
                      <strong>{stats?.byPriority.CRITICAL ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>High priority</span>
                      <strong>{stats?.byPriority.HIGH ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Resolved rate</span>
                      <strong>{stats?.resolvedRate ?? 0}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
