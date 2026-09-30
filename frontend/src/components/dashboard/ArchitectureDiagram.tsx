export function ArchitectureDiagram() {
  const stages = [
    { title: "Underground Sensor Nodes", detail: "H2S · CH4 · Air Quality · Level · Flow · Temp · Humidity", tag: "ESP32" },
    { title: "ESP-LoRa Mesh", detail: "Node-to-node relay, no Wi-Fi infrastructure required", tag: "MESH" },
    { title: "Gateway", detail: "Above-ground aggregation · ESP32 + 4G backhaul", tag: "GW" },
    { title: "Backend API", detail: "REST / WebSocket bridge — not yet connected", tag: "FUTURE" },
    { title: "Monitoring Dashboard", detail: "This application", tag: "LIVE" },
    { title: "AI / ML Prediction Layer", detail: "Blockage risk model — simulated in this demo", tag: "FUTURE" },
  ];

  return (
    <div className="flex flex-col items-stretch gap-0">
      {stages.map((s, i) => {
        const future = s.tag === "FUTURE";
        return (
          <div key={s.title} className="flex flex-col items-center">
            <div
              className={`w-full max-w-xl rounded-lg border p-4 ${
                future
                  ? "border-dashed border-[var(--color-line)] bg-[var(--color-bg-1)]"
                  : "border-[var(--color-line)] bg-[var(--color-bg-2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-text-0)]">{s.title}</p>
                <span
                  className={`mono rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    future ? "bg-[var(--color-bg-3)] text-[var(--color-text-2)]" : "bg-[var(--color-cyan)]/10 text-[var(--color-cyan)]"
                  }`}
                >
                  {s.tag}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-2)]">{s.detail}</p>
            </div>
            {i < stages.length - 1 && (
              <svg width="2" height="28" className="text-[var(--color-line)]">
                <line x1="1" y1="0" x2="1" y2="28" stroke="currentColor" strokeWidth="2" className="flow-line" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
