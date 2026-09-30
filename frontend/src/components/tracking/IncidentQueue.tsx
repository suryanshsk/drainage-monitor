import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Incident } from "@/types";

function badgeColor(priority: string) {
  if (priority === "CRITICAL") return "bg-[var(--color-crit-dim)] text-[var(--color-crit)]";
  if (priority === "HIGH") return "bg-[var(--color-warn-dim)] text-[var(--color-warn)]";
  if (priority === "MEDIUM") return "bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]";
  return "bg-[var(--color-ok-dim)] text-[var(--color-ok)]";
}

export function IncidentQueue({ incidents }: { incidents: Incident[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-2)]">No incidents in queue.</p>
        ) : (
          incidents.slice(0, 6).map((incident) => (
            <Link
              key={incident.id}
              to={`/tracking/${incident.id}`}
              className="block rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3 transition-colors hover:border-[var(--color-cyan)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-2)]">{incident.incident_number}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-0)]">{incident.title}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor(incident.priority)}`}>
                  {incident.priority}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-text-2)]">
                <span>{incident.status}</span>
                <span className="flex items-center gap-1">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
