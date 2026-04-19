import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Upload, Wind, TrendingUp, Activity, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AqiBadge } from "@/components/AqiBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTrends, type TrendPoint } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — AQI Prediction System" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Metrics states
  const [todayAqi, setTodayAqi] = useState<number>(0);
  const [predictedAqi, setPredictedAqi] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    getTrends(range).then((d) => {
      setData(d);
      
      // Extract latest actual & predicted for top cards
      if (d.length > 0) {
        const latestInfo = d[d.length - 1];
        setTodayAqi(latestInfo.actual ?? 0);
        setPredictedAqi(latestInfo.predicted ?? 0);
      }
      
      setLoading(false);
    });
  }, [range]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time and forecasted air quality at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="gap-1.5">
            <Upload className="h-4 w-4" /> Upload CSV
          </Button>
          <Button variant="outline" asChild className="gap-1.5">
            <Link to="/predict">
              <Wind className="h-4 w-4" /> Predict AQI
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Gauge className="h-4 w-4" />}
          label="Today's AQI"
          value={todayAqi}
          sub="Live reading"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Predicted (24h)"
          value={predictedAqi}
          sub="Model: RF v1.4.2"
        />
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AQI Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            <AqiBadge category="Good" size="sm" />
            <AqiBadge category="Moderate" size="sm" />
            <AqiBadge category="Unhealthy" size="sm" />
            <AqiBadge category="Hazardous" size="sm" />
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">AQI Trend</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Actual vs predicted air quality index
            </p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[340px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading chart…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 10, right: 16, bottom: 0, left: -10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                    label={{
                      value: "AQI",
                      angle: -90,
                      position: "insideLeft",
                      offset: 18,
                      style: { fill: "var(--color-muted-foreground)", fontSize: 12 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual AQI"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted AQI"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <span className="text-muted-foreground">{icon}</span>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold tracking-tight">{value}</span>
          <AqiBadge value={value} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
