/**
 * Centralized API client for the AQI Prediction System.
 *
 * All functions currently return mock data so the UI works without a backend.
 * To wire up your real backend:
 *   1. Set VITE_API_BASE_URL in your env (or change API_BASE_URL below)
 *   2. Replace each mock body with the commented `fetch(...)` call
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "aqi_auth_token";
const USER_KEY = "aqi_auth_user";

export type AqiCategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PredictInput {
  co: number;
  nox: number;
  no2: number;
  temperature: number;
  humidity: number;
  abs_humidity?: number;
  pt08_s1_co?: number;
  c6h6_gt?: number;
  pt08_s2_nmhc?: number;
  pt08_s3_nox?: number;
  pt08_s4_no2?: number;
  pt08_s5_o3?: number;
  nmhc_gt?: number;
}

export interface PredictionResult {
  id: string;
  aqi: number;
  category: AqiCategory;
  input: PredictInput;
  model: {
    name: string;
    version: string;
    confidence: number;
  };
  createdAt: string;
}

export interface TrendPoint {
  time: string;
  actual: number | null;
  predicted: number | null;
}

export interface HistoryItem {
  id: string;
  date: string;
  aqi: number;
  category: AqiCategory;
  pollutant: string;
  source: "manual" | "csv";
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- helpers ----------
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ---------- auth ----------
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
    throw new Error(err.detail || "Sign in failed");
  }
  
  const data = await res.json();
  const response: LoginResponse = {
    token: data.token,
    user: {
      id: data.email,
      name: data.email.split("@")[0],
      email: data.email,
    },
  };
  
  window.sessionStorage.setItem(TOKEN_KEY, response.token);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
  return response;
}

export async function addAdmin(email: string, password: string): Promise<{ message: string }> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE_URL}/add-admin`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to add admin" }));
    throw new Error(err.detail || "Failed to add admin");
  }
  
  return res.json();
}

export function logout(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

// ---------- predictions ----------
export async function predict(input: PredictInput): Promise<PredictionResult> {
  const reqBody = {
    co: input.co,
    nox: input.nox,
    no2: input.no2,
    temperature: input.temperature,
    humidity: input.humidity,
    abs_humidity: input.abs_humidity ?? 0.0,
    pt08_s1_co: input.pt08_s1_co,
    c6h6_gt: input.c6h6_gt,
    pt08_s2_nmhc: input.pt08_s2_nmhc,
    pt08_s3_nox: input.pt08_s3_nox,
    pt08_s4_no2: input.pt08_s4_no2,
    pt08_s5_o3: input.pt08_s5_o3,
    nmhc_gt: input.nmhc_gt,
  };

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Prediction failed");
  }

  const data = await res.json();
  const aqi = Math.round(data.predicted_aqi);
  const clamped = Math.min(500, Math.max(0, aqi));

  return {
    id: `p_${Date.now()}`,
    aqi: clamped,
    category: getAqiCategory(clamped),
    input,
    model: {
      name: "RandomForestRegressor", // Based on backend project name
      version: "v1.0",
      confidence: data.confidence,
    },
    createdAt: data.timestamp,
  };
}

// ---------- trends ----------
export async function getStaticTestResults(): Promise<TrendPoint[]> {
  try {
    const res = await fetch(`/static_test_results.json`);
    if (!res.ok) throw new Error("Failed to fetch static test results");
    const data = await res.json();
    
    return data.trend.map((point: any) => {
      const pt = new Date(point.time);
      return {
        time: pt.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit" }),
        actual: point.actual,
        predicted: point.predicted,
      };
    });
  } catch (error) {
    console.error("Error fetching static test results:", error);
    return [];
  }
}

export async function getTrends(
  range: "24h" | "7d" | "30d" = "7d",
): Promise<TrendPoint[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/aqi-comparison`);
    if (!res.ok) throw new Error("Failed to fetch trends");
    const data = await res.json();

    // Map backend actual/predicted to UI TrendPoint
    // Reversing or keeping it as is based on backend sorting (backend already returns oldest first in reversed query logic)
    return data.actual.map((act: any, i: number) => {
      const pt = new Date(act.timestamp);
      const pred = data.predicted[i];
      return {
        time: pt.toLocaleDateString([], { month: "short", day: "numeric" }),
        actual: act.aqi !== null ? Math.round(act.aqi) : null,
        predicted: pred?.aqi !== null ? Math.round(pred.aqi) : null,
      };
    });
  } catch (error) {
    console.warn("Falling back to local trend data if API fails", error);
    // fallback or rethrow
    return [];
  }
}

export interface HistoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: AqiCategory | "all";
  from?: string;
  to?: string;
}

export async function getHistory(q: HistoryQuery = {}): Promise<HistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/aqi-trends`);
  if (!res.ok) throw new Error("Failed to fetch history");
  const data = await res.json();
  
  // Backend returns oldest first, we want newest first
  const records = [...data.trend].reverse();

  let items: HistoryItem[] = records.map((r: any, i: number) => {
    const aqiVal = Math.round(r.predicted_aqi);
    return {
      id: `h_${Date.now()}_${i}`,
      date: new Date(r.timestamp).toISOString(),
      aqi: aqiVal,
      category: getAqiCategory(aqiVal),
      pollutant: "CO", // MVP uses CO as base prediction metric
      source: "manual",
    };
  });

  const { page = 1, pageSize = 10, search = "", category = "all", from, to } = q;

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(
      (x) => x.pollutant.toLowerCase().includes(s) || x.id.includes(s),
    );
  }
  if (category !== "all") items = items.filter((x) => x.category === category);
  if (from) items = items.filter((x) => x.date >= from);
  if (to) items = items.filter((x) => x.date <= to);

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export async function exportHistoryCsv(): Promise<Blob> {
  // Use real backend data for the export instead of mock stub
  const res = await fetch(`${API_BASE_URL}/aqi-trends`);
  if (!res.ok) throw new Error("Failed to fetch data for export");
  
  const data = await res.json();
  const records = [...data.trend].reverse();

  const rows = [
    ["id", "date", "aqi", "category", "pollutant", "source"],
    ...records.map((r: any, i: number) => {
      const aqiVal = Math.round(r.predicted_aqi);
      return [
        `export_${Date.now()}_${i}`,
        new Date(r.timestamp).toISOString(),
        String(aqiVal),
        getAqiCategory(aqiVal),
        "CO",
        "manual"
      ];
    }),
  ];
  
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  return new Blob([csv], { type: "text/csv" });
}

export async function uploadCsv(file: File): Promise<{ rows: number; jobId: string }> {
  const fd = new FormData();
  fd.append("file", file);
  
  const res = await fetch(`${API_BASE_URL}/upload-csv`, { 
    method: "POST", 
    body: fd 
  });
  
  if (!res.ok) {
    throw new Error("Failed to upload CSV");
  }
  
  await res.json();
  
  // Starting training immediately in background
  await fetch(`${API_BASE_URL}/train-model`, {
    method: "POST"
  });

  return { rows: Math.max(1, Math.round(file.size / 80)), jobId: `job_${Date.now()}` };
}

// ---------- forecasting ----------
export interface ForecastPoint {
  hours_ahead: number;
  predicted_timestamp: string;
  predicted_co: number;
  predicted_aqi: number;
}

export interface ForecastResponse {
  current_timestamp: string;
  forecasts: ForecastPoint[];
}

export async function forecast(input: PredictInput): Promise<ForecastResponse> {
  const reqBody = {
    co: input.co,
    nox: input.nox,
    no2: input.no2,
    temperature: input.temperature,
    humidity: input.humidity,
    abs_humidity: input.abs_humidity ?? 0.0,
    pt08_s1_co: input.pt08_s1_co,
    c6h6_gt: input.c6h6_gt,
    pt08_s2_nmhc: input.pt08_s2_nmhc,
    pt08_s3_nox: input.pt08_s3_nox,
    pt08_s4_no2: input.pt08_s4_no2,
    pt08_s5_o3: input.pt08_s5_o3,
    nmhc_gt: input.nmhc_gt,
  };

  const res = await fetch(`${API_BASE_URL}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Forecast failed");
  }

  return res.json() as Promise<ForecastResponse>;
}

export interface ForecastHistoryEntry {
  requested_at: string;
  forecasts: ForecastPoint[];
}

export async function getForecastHistory(limit = 5): Promise<ForecastHistoryEntry[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/forecast-history?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.history ?? []) as ForecastHistoryEntry[];
  } catch {
    return [];
  }
}

