import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wind, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AqiBadge } from "@/components/AqiBadge";
import { getHistory, getForecastHistory, isAuthenticated, type ForecastPoint } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home - AQI Prediction System" }] }),
  component: HomePage,
});

function HomePage() {
  const [latestTime, setLatestTime] = useState<string>("—");
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAqi, setCurrentAqi] = useState<number>(0);
  const isLogged = isAuthenticated();

  useEffect(() => {
    const loadData = async () => {
      try {
        const historyData = await getHistory();
        if (historyData.items.length > 0) {
          const latest = historyData.items[0]; // items are sorted newest first
          setCurrentAqi(latest.aqi ?? 0);
          setLatestTime(new Date(latest.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
        }

        const forecastHistory = await getForecastHistory(1);
        if (forecastHistory.length > 0) {
          const sorted = [...forecastHistory[0].forecasts].sort(
            (a, b) => a.hours_ahead - b.hours_ahead,
          );
          setForecasts(sorted.slice(0, 5));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 20%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 60%), radial-gradient(50% 40% at 85% 80%, color-mix(in oklab, var(--chart-1) 18%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-1">
                <Wind className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold">AQI Prediction System</h1>
            </div>
            {isLogged ? (
              <Link to="/dashboard">
                <Button variant="default">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="default">Admin Login</Button>
              </Link>
            )}
          </div>

          {/* Current AQI Section */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Current AQI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold">{Math.round(currentAqi)}</div>
                  <AqiBadge value={currentAqi} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time air quality measurement powered by Random Forest predictions
                </p>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-semibold">RandomForest v1.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Prediction</span>
                  <span className="font-semibold">{latestTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Forecast Preview */}
          {forecasts.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Next 5 Hours Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {forecasts.map((f) => (
                    <div key={f.hours_ahead} className="rounded-lg border border-border p-3 text-center">
                      <p className="text-xs text-muted-foreground">+{f.hours_ahead}h</p>
                      <p className="text-lg font-bold">{f.predicted_aqi}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
