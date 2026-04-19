import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AqiBadge } from "@/components/AqiBadge";
import type { PredictionResult } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/predict/result")({
  head: () => ({ meta: [{ title: "Prediction Result — AQI Prediction System" }] }),
  component: ResultPage,
});

function ResultPage() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("aqi_last_result");
    if (!raw) {
      setError("No prediction available. Run a new prediction to see results here.");
      setShowError(true);
      return;
    }
    try {
      setResult(JSON.parse(raw) as PredictionResult);
    } catch {
      setError("Failed to load the latest prediction.");
      setShowError(true);
    }
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {showError && error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setShowError(false)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {result && (
        <>
          <Card className="overflow-hidden shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Prediction Complete
              </p>
              <div className="flex flex-col items-center gap-3">
                <span className="text-6xl font-bold tracking-tight sm:text-7xl">
                  {result.aqi}
                </span>
                <AqiBadge value={result.aqi} size="lg" />
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                Model confidence:{" "}
                <span className="font-medium text-foreground">
                  {(result.model.confidence * 100).toFixed(1)}%
                </span>
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Input Values
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-sm">
                  <Row label="CO" value={`${result.input.co} mg/m³`} />
                  <Row label="NOx" value={`${result.input.nox} µg/m³`} />
                  <Row label="NO₂" value={`${result.input.no2} µg/m³`} />
                  <Row label="Temperature" value={`${result.input.temperature} °C`} />
                  <Row label="Humidity" value={`${result.input.humidity} %`} />
                </dl>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Model Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-sm">
                  <Row label="Model" value={result.model.name} />
                  <Row label="Version" value={result.model.version} />
                  <Row
                    label="Confidence"
                    value={`${(result.model.confidence * 100).toFixed(1)}%`}
                  />
                  <Row label="Prediction ID" value={result.id} />
                  <Row
                    label="Generated"
                    value={new Date(result.createdAt).toLocaleString()}
                  />
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/predict">New Prediction</Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard">View Dashboard</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
