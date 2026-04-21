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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Upload, Wind, TrendingUp, Activity, Gauge, Clock, Home } from "lucide-react";
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
import {
  getTrends,
  getHistory,
  getStaticTestResults,
  getForecastHistory,
  getAqiCategory,
  type TrendPoint,
  type ForecastPoint,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — AQI Prediction System" }],
  }),
  component: DashboardPage,
});

function aqiColor(aqi: number): string {
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#facc15";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

function DashboardPage() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([]);
  const [forecastTime, setForecastTime] = useState<string | null>(null);
  const [todayAqi, setTodayAqi] = useState<number>(0);
  const [predictedAqi, setPredictedAqi] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    // Load historical static test data for the chart mapping
    getStaticTestResults().then((d) => {
      setData(d);
      setLoading(false);
    });

    // Separately load the live actual latest prediction to populate the Dashboard metrics header
    getHistory().then((hist) => {
      if (hist.items.length > 0) {
        const latest = hist.items[0];
        setTodayAqi(latest.aqi ?? 0);
        setPredictedAqi(latest.aqi ?? 0);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    getForecastHistory(1).then((history) => {
      if (history.length > 0) {
        const latest = history[0];
        const sorted = [...latest.forecasts].sort(
          (a, b) => a.hours_ahead - b.hours_ahead,
        );
        setForecasts(sorted);
        setForecastTime(latest.requested_at);
      }
    });
  }, []);

  const forecastChartData = forecasts.map((f) => ({
    name: `+${f.hours_ahead}h`,
    aqi: f.predicted_aqi,
    fill: aqiColor(f.predicted_aqi),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time and forecasted air quality at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild className="gap-1.5">
            <Link to="/">
              <Home className="h-4 w-4" /> Go back to client home page
            </Link>
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
          sub="Latest Current Prediction"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Predicted (24h)"
          value={predictedAqi}
          sub="Next window estimation"
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

      {/* Future Forecast Panel — shown only when a forecast is available */}
      {forecasts.length > 0 && (
        <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Future AQI Forecast</CardTitle>
                {forecastTime && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Based on reading at{" "}
                    {new Date(forecastTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-8"
            >
              <Link to="/predict">
                <TrendingUp className="h-3.5 w-3.5" />
                Run New Forecast
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Horizon tiles */}
              <div className="grid grid-cols-4 gap-2">
                {forecasts.map((f) => {
                  const cat = getAqiCategory(f.predicted_aqi);
                  const color = aqiColor(f.predicted_aqi);
                  return (
                    <div
                      key={f.hours_ahead}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border bg-background/70 py-3 text-center shadow-sm"
                      style={{ borderTopColor: color, borderTopWidth: 3 }}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        +{f.hours_ahead}hr
                      </div>
                      <span
                        className="text-2xl font-bold tabular-nums"
                        style={{ color }}
                      >
                        {f.predicted_aqi}
                      </span>
                      <span className="px-1 text-[9px] leading-tight text-muted-foreground">
                        {cat}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mini forecast bar chart */}
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={forecastChartData}
                    margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "var(--color-muted-foreground)",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: "var(--color-muted-foreground)",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                      formatter={(val: number) => [`AQI ${val}`, ""]}
                    />
                    <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                      {forecastChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical trend chart */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Model Performance (Static Test Set)</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Actual vs Predicted AQI Values from Model Evaluation
            </p>
          </div>
          
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
                    tick={{
                      fill: "var(--color-muted-foreground)",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: "var(--color-muted-foreground)",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                    label={{
                      value: "AQI",
                      angle: -90,
                      position: "insideLeft",
                      offset: 18,
                      style: {
                        fill: "var(--color-muted-foreground)",
                        fontSize: 12,
                      },
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

