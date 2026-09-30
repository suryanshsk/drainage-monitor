import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PredictionCard, RiskMatrix } from "@/components/dashboard/PredictionCard";
import { SimulatedBadge } from "@/components/ui/Misc";
import { LoadingState } from "@/components/ui/Misc";
import { usePredictions } from "@/hooks/useDrainageData";

export default function PredictionsPage() {
  const { predictions, loading } = usePredictions();

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    predictions.forEach((p) => c[p.risk]++);
    return c;
  }, [predictions]);

  const highlighted = predictions.slice(0, 6);

  return (
    <AppShell title="AI Drainage Intelligence" subtitle="Blockage risk prediction — future ML integration point">
      <div className="space-y-5">
        {loading ? (
          <LoadingState rows={4} />
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>Risk matrix</CardTitle></CardHeader>
              <CardContent><RiskMatrix counts={counts} /></CardContent>
            </Card>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-0)]">Highest-priority predictions</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {highlighted.map((p) => (
                  <PredictionCard key={p.nodeId} prediction={p} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
