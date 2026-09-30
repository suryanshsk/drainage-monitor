import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { SensorReading } from "@/types";

interface SeriesConfig {
  key: keyof SensorReading;
  color: string;
  label: string;
  unit?: string;
}

/** Pick X-axis tick format based on how many hours of data are shown. */
function xTickFormatter(hours: number) {
  return (v: any) => {
    const d = new Date(v);
    if (hours <= 24) {
      // e.g.  "14:35"
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (hours <= 7 * 24) {
      // e.g.  "Sep 29 14:00"
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) +
             " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    // e.g.  "Sep 29"
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };
}

function tooltipLabelFormatter(hours: number) {
  return (v: any) => {
    const d = new Date(String(v));
    if (hours <= 24) {
      return d.toLocaleString("en-IN");
    }
    return d.toLocaleDateString("en-IN", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };
}

export function SensorChart({
  data,
  series,
  height = 220,
  hours = 24,
}: {
  data: SensorReading[];
  series: SeriesConfig[];
  height?: number;
  hours?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#1a2023" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={xTickFormatter(hours)}
          stroke="#6f7d81"
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
          minTickGap={hours <= 24 ? 40 : hours <= 168 ? 60 : 80}
        />
        <YAxis stroke="#6f7d81" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} width={36} />
        <Tooltip
          contentStyle={{
            background: "#12171a",
            border: "1px solid #232b2f",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={tooltipLabelFormatter(hours)}
          labelStyle={{ color: "#aab6b9", marginBottom: 4 }}
        />
        {series.map((s) => (
          <Line
            key={String(s.key)}
            type="monotone"
            dataKey={s.key}
            name={`${s.label}${s.unit ? ` (${s.unit})` : ""}`}
            stroke={s.color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

