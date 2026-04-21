import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Loader2, UploadCloud, FileSpreadsheet, Dices, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  predict, forecast, uploadCsv,
  type PredictInput, type PredictionResult, type ForecastResponse,
  getAqiCategory,
} from "@/lib/api";
import { AqiBadge } from "@/components/AqiBadge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/predict")({
  head: () => ({ meta: [{ title: "Predict AQI — AQI Prediction System" }] }),
  component: PredictPage,
});

interface FieldDef {
  key: keyof PredictInput;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  optional?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "co", label: "CO", unit: "mg/m³", min: 0, max: 50, step: 0.1 },
  { key: "nox", label: "NOx", unit: "µg/m³", min: 0, max: 400, step: 1 },
  { key: "no2", label: "NO₂", unit: "µg/m³", min: 0, max: 400, step: 1 },
  { key: "temperature", label: "Temperature", unit: "°C", min: -30, max: 60, step: 0.5 },
  { key: "humidity", label: "Humidity", unit: "%", min: 0, max: 100, step: 1 },
  { key: "abs_humidity", label: "Abs Humidity", unit: "g/m³", min: 0, max: 100, step: 0.1, optional: true },
  
  { key: "pt08_s1_co", label: "PT08(CO)", unit: "raw", min: 0, max: 3000, step: 1, optional: true },
  { key: "c6h6_gt", label: "Benzene", unit: "µg/m³", min: 0, max: 100, step: 0.1, optional: true },
  { key: "pt08_s2_nmhc", label: "PT08(NMHC)", unit: "raw", min: 0, max: 3000, step: 1, optional: true },
  { key: "pt08_s3_nox", label: "PT08(NOx)", unit: "raw", min: 0, max: 3000, step: 1, optional: true },
  { key: "pt08_s4_no2", label: "PT08(NO₂)", unit: "raw", min: 0, max: 3000, step: 1, optional: true },
  { key: "pt08_s5_o3", label: "PT08(O₃)", unit: "raw", min: 0, max: 3000, step: 1, optional: true },
  { key: "nmhc_gt", label: "NMHC", unit: "µg/m³", min: 0, max: 2000, step: 1, optional: true },
];

function PredictPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<Record<keyof PredictInput, string>>({
    co: "",
    nox: "",
    no2: "",
    temperature: "",
    humidity: "",
    abs_humidity: "",
    pt08_s1_co: "",
    c6h6_gt: "",
    pt08_s2_nmhc: "",
    pt08_s3_nox: "",
    pt08_s4_no2: "",
    pt08_s5_o3: "",
    nmhc_gt: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PredictInput, string>>>({});
  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [inlineResult, setInlineResult] = useState<PredictionResult | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);

  const setField = (k: keyof PredictInput, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const validate = (): PredictInput | null => {
    const next: typeof errors = {};
    const parsed: Partial<PredictInput> = {};
    for (const f of FIELDS) {
      const raw = values[f.key];
      if (raw === "" || raw === undefined) {
        if (!f.optional) {
          next[f.key] = "Required";
        }
        continue;
      }
      const num = Number(raw);
      if (Number.isNaN(num)) {
        next[f.key] = "Must be a number";
        continue;
      }
      if (num < f.min || num > f.max) {
        next[f.key] = `Must be between ${f.min} and ${f.max}`;
        continue;
      }
      parsed[f.key] = num;
    }
    setErrors(next);
    if (Object.keys(next).length) return null;
    return parsed as PredictInput;
  };

  const handleSubmit = async () => {
    const input = validate();
    if (!input) return;
    setLoading(true);
    setInlineResult(null);
    try {
      const result = await predict(input);
      sessionStorage.setItem("aqi_last_result", JSON.stringify(result));
      setInlineResult(result);
    } catch (err: any) {
      console.error(err);
      setErrors({ co: "API Error: " + (err.message || 'Failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleForecast = async () => {
    const input = validate();
    if (!input) return;
    setForecastLoading(true);
    setForecastResult(null);
    try {
      const result = await forecast(input);
      setForecastResult(result);
    } catch (err: any) {
      console.error(err);
      setErrors({ co: "Forecast Error: " + (err.message || 'Failed') });
    } finally {
      setForecastLoading(false);
    }
  };

  const handleRandomize = () => {
    const r = (min: number, max: number, decimals = 1) => {
      const val = Math.random() * (max - min) + min;
      return val.toFixed(decimals);
    };
    
    setValues({
      co: r(1, 10, 1),
      nox: r(50, 200, 0),
      no2: r(30, 150, 0),
      temperature: r(5, 45, 1),
      humidity: r(20, 80, 0),
      abs_humidity: r(0.5, 2.5, 1),
      pt08_s1_co: r(800, 1500, 0),
      c6h6_gt: r(2, 20, 1),
      pt08_s2_nmhc: r(600, 1200, 0),
      pt08_s3_nox: r(300, 1000, 0),
      pt08_s4_no2: r(800, 1800, 0),
      pt08_s5_o3: r(500, 1500, 0),
      nmhc_gt: r(50, 500, 0),
    });
    setErrors({});
    setInlineResult(null);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadInfo(`Uploading ${file.name}…`);
    const res = await uploadCsv(file);
    setUploadInfo(`Processed ${res.rows} rows from ${file.name} (job ${res.jobId})`);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Predict AQI</h1>
        <p className="text-sm text-muted-foreground">
          Run a single prediction or upload a CSV for batch inference.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Manual input */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Manual Input</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the latest pollutant and weather readings.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomize}
              disabled={loading}
              className="gap-1.5 h-8 px-3 text-xs shrink-0"
            >
              <Dices className="h-3.5 w-3.5" />
              Randomize
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {FIELDS.map((f) => {
                const err = errors[f.key];
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    <div className="relative">
                      <Input
                        id={f.key}
                        type="number"
                        inputMode="decimal"
                        step={f.step}
                        min={f.min}
                        max={f.max}
                        placeholder="0"
                        value={values[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        disabled={loading}
                        className={cn(
                          "h-10 pr-16 rounded-lg",
                          err && "border-destructive focus-visible:ring-destructive/40",
                        )}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {f.unit}
                      </span>
                    </div>
                    {err && <p className="text-xs text-destructive">{err}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={loading || forecastLoading}
                className="h-11 flex-1 rounded-lg bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  "Run Prediction"
                )}
              </Button>
              <Button
                onClick={handleForecast}
                disabled={loading || forecastLoading}
                variant="outline"
                className="h-11 flex-1 gap-2 rounded-lg border-primary/40 text-primary hover:bg-primary/5"
              >
                {forecastLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Forecasting…
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Forecast Future
                  </>
                )}
              </Button>
            </div>

            {inlineResult && (
              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5 shadow-inner">
                <div className="flex flex-col items-center justify-center gap-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Current AQI
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-5xl font-bold tabular-nums tracking-tight">
                      {inlineResult.aqi}
                    </span>
                    <AqiBadge value={inlineResult.aqi} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Model Confidence: <span className="font-medium text-foreground">{(inlineResult.model.confidence * 100).toFixed(1)}%</span>
                  </p>
                </div>
              </div>
            )}

            {forecastResult && <ForecastPanel result={forecastResult} />}
          </CardContent>
        </Card>

        {/* CSV upload */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Batch CSV</CardTitle>
            <p className="text-xs text-muted-foreground">
              Drop a CSV with the same columns to predict at scale.
            </p>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:bg-muted/50",
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Drop CSV here</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-1 text-xs text-primary hover:underline"
              >
                or click to browse
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                onChange={onPick}
                className="hidden"
              />
              <p className="mt-3 text-[11px] text-muted-foreground">
                Max 5 MB · UTF-8 encoded
              </p>
            </div>
            {uploadInfo && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
                <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{uploadInfo}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── AQI colour helpers ───────────────────────────────────────────────────────
function aqiColor(aqi: number): string {
  if (aqi <= 50)  return "#22c55e";   // green
  if (aqi <= 100) return "#facc15";   // yellow
  if (aqi <= 150) return "#f97316";   // orange
  if (aqi <= 200) return "#ef4444";   // red
  if (aqi <= 300) return "#a855f7";   // purple
  return "#7f1d1d";                    // maroon/hazardous
}

// ─── Forecast Panel ───────────────────────────────────────────────────────────
function ForecastPanel({ result }: { result: ForecastResponse }) {
  const chartData = result.forecasts.map((f) => ({
    name: `+${f.hours_ahead}h`,
    aqi: f.predicted_aqi,
    fill: aqiColor(f.predicted_aqi),
  }));

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/0 p-5 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Future AQI Forecast</p>
          <p className="text-[11px] text-muted-foreground">
            Recursive multi-step prediction from{" "}
            {new Date(result.current_timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Horizon tiles */}
      <div className="grid grid-cols-4 gap-2">
        {result.forecasts.map((f) => {
          const cat = getAqiCategory(f.predicted_aqi);
          const color = aqiColor(f.predicted_aqi);
          return (
            <div
              key={f.hours_ahead}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border/60 bg-background/60 py-3 text-center shadow-sm transition-shadow hover:shadow-md"
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
              <span className="text-[10px] text-muted-foreground leading-tight px-1">
                {cat}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mini bar chart */}
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
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
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
