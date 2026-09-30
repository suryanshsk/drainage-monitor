import type { IncidentEvent } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function IncidentTimeline({ events }: { events: IncidentEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-[var(--color-text-2)]">No timeline data yet.</p>
        ) : (
          <div className="relative space-y-5 before:absolute before:bottom-0 before:left-[7px] before:top-0 before:w-px before:bg-[var(--color-line)]">
            {events.map((event) => (
              <div key={event.id} className="relative pl-8">
                <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-cyan)]" />
                <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-0)]">{event.event_type}</p>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-2)]">{event.actor_role ?? "SYSTEM"}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-1)]">{event.message ?? "No message"}</p>
                  <p className="mt-2 text-[10px] text-[var(--color-text-2)]">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
