# Frontend Architecture Explained (AQI-Prediction-Random-Forest)

This document explains how the frontend is built, how data flows through it, and why it is structured this way.

---

## 1) Project Overview

### What the frontend is doing at a high level

The frontend is the user-facing dashboard for the AQI system. It allows users to:

1. Log in as admin.
2. View current AQI and model metrics overview on dashboards.
3. Submit manual sensor input and run prediction.
4. Run future forecast (+1h, +3h, +6h, +12h) and visualize results.
5. View prediction history with filtering and CSV export.
6. Manage settings (theme toggle, add admin).

So the frontend acts as:

- Presentation layer (UI + charts + forms)
- Navigation layer (routes and protected sections)
- API client layer (calls backend and maps responses into UI-friendly models)

### How the frontend is structured

Main folders and roles:

- FRONTEND/src/routes: Route-based pages (login, dashboard, predict, history, settings).
- FRONTEND/src/lib/api.ts: Centralized API client and frontend data mapping.
- FRONTEND/src/router.tsx: Router creation and global error component.
- FRONTEND/src/routes/__root.tsx: App HTML shell, head metadata, global route outlet.
- FRONTEND/src/components: Reusable UI building blocks.
- FRONTEND/src/styles.css: Design tokens and Tailwind theme variables.
- FRONTEND/src/lib/theme.ts: Light/dark theme hook.

---

## 2) Application Setup

### Framework and runtime

This app uses:

- React + TypeScript
- TanStack Router (file-based route generation)
- TanStack Start integration with Vite
- Tailwind CSS v4 tokens and utility classes
- Recharts for data visualization

### Entry and bootstrapping model

Unlike classic React apps with a visible main.tsx bootstrap file, this app uses TanStack Start managed startup.

Practical entry pieces:

1. Router factory in FRONTEND/src/router.tsx (getRouter).
2. Root shell in FRONTEND/src/routes/__root.tsx.
3. Generated route map in FRONTEND/src/routeTree.gen.ts.
4. Vite startup via npm scripts in FRONTEND/package.json.

Theory:

- TanStack Start handles SSR/client boot details for you.
- You mainly provide route files and router config, then the framework wires startup.

### Build and deployment setup

- Local scripts: dev/build/preview from FRONTEND/package.json.
- Netlify base/publish are configured in netlify.toml.
- API proxy rewrite exists in FRONTEND/public/_redirects:
  - /api/* is proxied to the backend host.

Theory:

- Frontend can call same-origin /api in production, while rewrites forward to real backend.
- This avoids hardcoding cross-origin backend URLs in production UI code.

---

## 3) Routing and Navigation

### How routes are organized

Routes are file-based and generated into FRONTEND/src/routeTree.gen.ts.

Important route groups:

- Public:
  - / (home)
  - /login
- Protected under /_authenticated route wrapper:
  - /dashboard
  - /predict
  - /predict/result
  - /history
  - /settings

The layout wrapper in FRONTEND/src/routes/_authenticated.tsx defines:

- Shared sidebar
- Shared top header
- Main content outlet

### Route protection (frontend auth guard)

In FRONTEND/src/routes/_authenticated.tsx:

- beforeLoad checks isAuthenticated().
- If not authenticated, user is redirected to /login.

Theory:

- Route guards are navigation-level access control in the client.
- This improves UX, but backend must still enforce security for real protection.

### Error and not-found handling

- Global router error fallback is in FRONTEND/src/router.tsx (DefaultErrorComponent).
- 404 page is in FRONTEND/src/routes/__root.tsx (notFoundComponent).

This gives a robust navigation experience even when something fails.

---

## 4) Data and API Integration

### Centralized API client

All backend communication is centralized in FRONTEND/src/lib/api.ts.

Key API functions include:

- login, addAdmin, logout
- predict, forecast
- getHistory, exportHistoryCsv
- getTrends, getForecastHistory
- uploadCsv

Benefits of this design:

1. Pages stay focused on UI logic.
2. Response mapping is consistent in one place.
3. Easier to change backend contract without touching every route.

### Environment-aware API base URL

In api.ts:

- Dev uses VITE_API_BASE_URL if provided, else http://127.0.0.1:8000.
- Production uses /api.

Theory:

- Environment-based base URL is a standard frontend pattern.
- Prevents scattering host strings across components.

### Frontend response mapping

The API layer maps raw backend responses into UI models.

Examples:

- Backend predicted_aqi becomes rounded and clamped aqi in PredictionResult.
- AQI number is transformed into semantic category via getAqiCategory().
- History and trend responses are transformed into display-friendly objects.

This adapter pattern is good practice because backend and UI shapes often differ.

---

## 5) State Management and UI Flow

### Current approach

State is mostly local component state using React hooks:

- useState for form values, loading states, errors, results.
- useEffect for initial data fetches (dashboard/history/home).

No global store (Redux/Zustand) is currently required.

Why this works here:

- App scope is moderate.
- Most state is page-local and short-lived.
- Shared concerns are handled via helper hooks and API module.

### Session and auth state

Auth is stored in sessionStorage in api.ts:

- token under aqi_auth_token
- user under aqi_auth_user

Used by:

- isAuthenticated for route guards
- getStoredUser for sidebar/settings display

Theory:

- sessionStorage survives reload in same tab, but clears on full session end.
- This is simple for MVP; stronger auth patterns can be added later.

---

## 6) Forms, Validation, and User Inputs

### Login form

In FRONTEND/src/routes/login.tsx:

- Controlled inputs for email/password.
- Async submit with loading/error handling.
- On success, navigates to /dashboard.

### Predict form

In FRONTEND/src/routes/_authenticated/predict.tsx:

- Field definitions are centralized in a FIELDS array.
- validate() checks required and numeric values.
- Same validated input is reused for:
  - predict request
  - forecast request

This is a clean pattern because validation and UI generation stay in sync.

### History filters

In FRONTEND/src/routes/_authenticated/history.tsx:

- Search text, category select, date range filters.
- Pagination state controls visible rows.
- CSV export generates downloadable file from current backend data.

---

## 7) UI Architecture and Styling System

### Design system base

The app uses reusable UI primitives in FRONTEND/src/components/ui.

Examples:

- Button, Input, Card, Table, Select, Popover, Calendar, Sidebar.

Page-level components compose these primitives for full screens.

### Theme and tokens

In FRONTEND/src/styles.css:

- Custom design tokens are defined as CSS variables.
- Separate light and dark variable sets exist.
- AQI semantic colors are explicit tokens (good, moderate, unhealthy, etc).

In FRONTEND/src/lib/theme.ts:

- Theme state is toggled and persisted to localStorage.
- Root dark class is applied/removed on html element.

Theory:

- Token-driven theming keeps visual design consistent and maintainable.
- Components refer to semantic colors instead of hardcoded values where possible.

### Visualization layer

Charts are built using Recharts in dashboard and predict pages:

- Line charts for actual vs predicted trends.
- Bar charts for forecast horizons.
- AQI color coding maps values to meaningful health states.

---

## 8) End-to-End Frontend Business Flow

### Example: Predict AQI flow

1. User opens /predict (protected route).
2. Form values are entered and validated.
3. predict(input) is called from api.ts.
4. Backend response is transformed into PredictionResult.
5. UI renders AQI value, category badge, and confidence.
6. Result is optionally stored in sessionStorage for continuity.

### Example: Dashboard load flow

1. User opens /dashboard.
2. useEffect loads static test trends for chart.
3. getHistory gets latest AQI for metric cards.
4. getForecastHistory gets latest forecast set.
5. Data is transformed and rendered as cards + charts.

This separation keeps route components focused on orchestration, while api.ts does transport and mapping.

---

## 9) Advanced Features Present

1. Route-level guards using beforeLoad.
2. Centralized API abstraction with environment-aware base URL.
3. Generated typed route tree from file routes.
4. Themed UI with persisted dark/light mode.
5. Reusable component library for consistent UX.
6. Graceful UI fallbacks (loading states, errors, no-data states, 404).

---

## 10) Best Practices and Design Choices

### Good choices already in place

1. Clear separation between UI pages and API transport logic.
2. Protected layout route for authenticated sections.
3. Reusable design primitives and consistent styling tokens.
4. Stable route typing through generated route tree.
5. Environment-specific API base handling.

### Potential improvements

1. Introduce React Query for server state.
   - You already depend on @tanstack/react-query but mostly use manual fetch/useEffect.
   - React Query would improve caching, retries, stale state handling, and loading consistency.

2. Strengthen auth handling.
   - Frontend guard is useful, but token lifecycle should include expiry handling and refresh strategy.
   - Add centralized unauthorized interceptor behavior.

3. Add shared request utility.
   - A typed fetch wrapper can reduce repeated error parsing and headers logic.

4. Improve date filtering robustness.
   - Ensure timezone-aware filter boundaries to avoid subtle history edge cases.

5. Add route-level suspense/loading boundaries.
   - Can improve perceived performance for data-heavy screens.

6. Modularize larger pages.
   - predict.tsx and dashboard.tsx can be split into smaller presentational components.

---

## 11) Frontend Theory (Quick Primer)
-
### Why central API modules matter

Direct fetch calls inside every component lead to duplication and inconsistent handling. A central API module provides one contract layer between backend and UI.

### Why route guards are important

Client-side route guards improve UX and prevent accidental navigation to private pages. They do not replace backend security checks.

### Local state vs server state

- Local state: form input, modal open/close, selected tab.
- Server state: data fetched from API and synchronized over time.

When server state grows, dedicated libraries like React Query become valuable.

### Why generated route trees help

Typed route generation catches navigation mistakes early and gives safer links/refactors.

---

## 12) Simple Summary (Junior Developer Version)

Think of this frontend as three layers:

1. Pages (routes) decide what screen to show.
2. API module talks to backend and shapes data for UI.
3. Reusable components render polished interface pieces.

When a user performs an action:

1. Route component collects input.
2. It calls a function from api.ts.
3. Backend returns data.
4. Frontend maps that data and updates state.
5. UI re-renders charts/cards/tables.

So the project is already on a good architecture path: clean route structure, centralized API logic, protected sections, and a reusable UI system. The biggest next upgrade would be stronger server-state management and auth hardening.
