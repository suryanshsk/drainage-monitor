import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function TrackingKpiCards({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string; icon: LucideIcon; accent: "cyan" | "warn" | "crit" | "ok" }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, helper, icon: Icon, accent }) => (
        <Card key={label} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-2)]">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-0)]">{value}</p>
              <p className="mt-2 text-xs text-[var(--color-text-2)]">{helper}</p>
            </div>
            <div
              className={[
                "flex h-10 w-10 items-center justify-center rounded-md",
                accent === "crit" && "bg-[var(--color-crit-dim)] text-[var(--color-crit)]",
                accent === "warn" && "bg-[var(--color-warn-dim)] text-[var(--color-warn)]",
                accent === "ok" && "bg-[var(--color-ok-dim)] text-[var(--color-ok)]",
                accent === "cyan" && "bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
