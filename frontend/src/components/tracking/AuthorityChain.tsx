import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function AuthorityChain() {
  const chain = ["SENSOR", "GATEWAY", "MUNICIPAL RESPONSE", "REGIONAL AUTHORITY", "STATE / CENTRAL", "OVERSIGHT"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authority Chain</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {chain.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-bg-1)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-1)]">
                {step}
              </span>
              {index < chain.length - 1 && <span className="text-[var(--color-text-2)]">→</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
