# Doctor Tracker Frontend

Next.js 16 App Router frontend for the Doctor Tracker admin console. It provides the sign-in screen, protected dashboard, doctor directory, patient directory, detail pages, CRUD dialogs, charts, and responsive layouts.

The frontend does not call the Express API directly from the browser. It calls same-origin `/api/*` paths, and `next.config.mjs` rewrites those requests to the backend URL. This keeps the session cookie first-party and keeps the JWT out of JavaScript.

> **Status:** This README documents the implemented frontend. It does not describe a deployment that has been performed. No Vercel project was created and no Git repository was initialised during Stage 7.

## Contents

- [Architecture](#architecture)
- [Routes](#routes)
- [API client and /api proxy](#api-client-and-api-proxy)
- [Authentication flow](#authentication-flow)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Production build](#production-build)
- [Testing and verification](#testing-and-verification)
- [Vercel configuration](#vercel-configuration)
- [Known limitations](#known-limitations)

## Architecture

```text
src/
├── app/
│   ├── layout.js                 Root layout, metadata, AuthProvider, Toaster
│   ├── page.js                   Redirects / to /dashboard
│   ├── globals.css               Tailwind and theme styles
│   ├── login/page.jsx            Admin sign-in screen
│   └── (app)/
│       ├── layout.jsx            Protected session gate and AppShell
│       ├── dashboard/page.jsx    Stats, charts, recent activity
│       ├── doctors/
│       │   ├── page.jsx          Doctor list
│       │   └── [id]/page.jsx     Doctor detail and assigned patients
│       └── patients/
│           ├── page.jsx          Patient list
│           └── [id]/page.jsx     Patient detail
├── components/
│   ├── app-shell.jsx             Sidebar, mobile drawer, account menu, sign out
│   ├── page-header.jsx
│   ├── data-pagination.jsx
│   ├── data-states.jsx           Empty and error states
│   ├── loading-state.jsx         Skeletons
│   ├── dashboard/                Recharts panels and dashboard cards
│   ├── doctors/                  Doctor form, delete, assign/remove patient dialogs
│   ├── patients/                 Patient form and delete dialogs
│   └── ui/                       shadcn/Base UI primitives
└── lib/
    ├── api.js                    Fetch wrapper, ApiError, query builder
    ├── auth-context.jsx          Session provider and useAuth hook
    ├── doctor-form.js            Client-side doctor form mapping/validation
    ├── patient-form.js           Client-side patient form mapping/validation
    ├── format.js                 Date/number/text formatting
    ├── use-debounced-value.js    Debounced search input helper
    └── utils.js                  cn() class-name helper
```

The project uses JavaScript/JSX rather than TypeScript. The `@/*` import alias maps to `src/*` through `jsconfig.json`.

The UI stack is Tailwind CSS 4, shadcn/Base UI components, Lucide icons, Recharts, Sonner toasts, and `next-themes`. The shadcn configuration is in `components.json` (style `base-nova`, RSC enabled, CSS variables enabled).

### Rendering model

- The root layout is a server component. It wraps the app in `AuthProvider` and mounts the Sonner toaster.
- `/` is a server component that redirects to `/dashboard`.
- The login page and every protected page are client components because they use browser state, fetch, and navigation.
- The protected `(app)` layout is a client component. It does not render private page content until the API confirms the session.
- Doctor and patient detail routes are dynamic (`/doctors/[id]`, `/patients/[id]`); the list and dashboard routes are statically prerenderable shells that fetch data in the browser.

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Redirects to `/dashboard` | Public redirect |
| `/login` | Admin sign-in form | Public; redirects authenticated users to `/dashboard` |
| `/dashboard` | Summary cards, charts, recent patients/doctors | Protected |
| `/doctors` | Searchable, filterable, sortable, paginated doctor list | Protected |
| `/doctors/[id]` | Doctor details and assigned-patient management | Protected |
| `/patients` | Searchable, filterable, sortable, paginated patient list | Protected |
| `/patients/[id]` | Patient details, address, notes, primary doctor | Protected |

Creating and editing records happens in dialogs on the list/detail pages; there are no separate `/new` or `/edit` routes.

The sidebar contains Dashboard, Doctors, and Patients. On narrow screens it becomes a sheet/drawer. The account area shows the signed-in admin and a sign-out action.

## API client and /api proxy

### Browser side

`src/lib/api.js` exposes:

- `api.get(path, options)`
- `api.post(path, body, options)`
- `api.patch(path, body, options)`
- `api.delete(path, options)`
- `buildQuery(params)`
- `getErrorMessage(error)`
- `ApiError`

Every request goes to `API_BASE = "/api"` plus the supplied path. The wrapper always uses:

```js
fetch(`/api${normalizedPath}`, {
  method,
  credentials: "include",
  cache: "no-store",
  headers: {
    Accept: "application/json",
    ...(body === undefined ? {} : { "Content-Type": "application/json" }),
  },
  body: body === undefined ? undefined : JSON.stringify(body),
});
```

Because the request is same-origin and includes credentials, the browser sends the HttpOnly session cookie automatically. JavaScript never reads or stores the token.

`ApiError` carries the HTTP status, field errors, and two convenience getters:

- `isUnauthorized` — status `401`
- `isNetworkError` — status `0`

`fieldErrors` converts `[{ field, message }]` into a `{ field: message }` object for form rendering. The client also normalizes network failures, non-JSON responses, empty `200` responses, `204` deletes, and `{ success: false }` payloads into `ApiError` instances.

### Server side

`next.config.mjs` reads:

```js
const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
```

and declares:

```js
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${backendUrl}/api/:path*`,
    },
  ];
}
```

So:

- Browser request: `https://frontend.example/api/doctors`
- Next.js rewrite target: `https://backend.example/api/doctors`

The rewrite runs on the Next.js server. `BACKEND_URL` is therefore server-side configuration and is not exposed as a `NEXT_PUBLIC_*` variable.

**The `http://localhost:5001` fallback is for local development only.** If `BACKEND_URL` is missing in a production build, the rewrite targets localhost inside the deployment environment and API requests fail. Always set `BACKEND_URL` for Vercel Production (and Preview, if used).

The same config file also disables the React Compiler and Cache Components and configures the Tailwind Turbopack CSS loader. Those settings are part of the existing build and should not be changed as part of deployment.

## Authentication flow

`AuthProvider` in `src/lib/auth-context.jsx` owns session state:

| Status | Meaning |
| --- | --- |
| `loading` | The initial `/auth/me` request is in flight |
| `authenticated` | The API returned an admin |
| `unauthenticated` | The API returned `401` |
| `error` | The session check failed for a non-401 reason (network/server) |

### On page load

1. `AuthProvider` calls `api.get("/auth/me")` once. A ref guard prevents React Strict Mode's development double-mount from issuing two checks.
2. `200` stores the admin and sets `authenticated`.
3. `401` clears the admin and sets `unauthenticated`.
4. Any other failure sets `error` with a human-readable message.

### Protected layout

`src/app/(app)/layout.jsx`:

- `authenticated` renders `<AppShell>{children}</AppShell>`.
- `unauthenticated` redirects to `/login` with `router.replace`.
- `error` renders a "Could not verify your session" card with Try again and Go to sign in actions.
- `loading` renders a session-check skeleton. Private content is never shown while the check is unresolved.

### Sign in

`/login` validates email format and a password of at least 8 characters locally, then calls `api.post("/auth/login", { email, password })`. On success the provider stores the admin and sets `authenticated`; an effect redirects to `/dashboard`. A `401` shows "Invalid email or password"; a `422` maps field errors into the form.

### Sign out

The account menu calls `logout()`, which posts `/auth/logout` and clears the local session in a `finally` block. Even if the request fails, the UI stops showing private data. The backend clears the cookie.

### Security boundary

The frontend hides UI and redirects, but it is not the security boundary. Every protected backend endpoint verifies the JWT cookie independently. Direct requests without a valid cookie receive `401`.

## Environment variables

The only frontend variable is `BACKEND_URL`.

| Variable | Required | Example | Meaning |
| --- | --- | --- | --- |
| `BACKEND_URL` | Production: **Yes**; local: recommended | `http://localhost:5001` | Server-side base URL for the `/api/:path*` rewrite. Read at build/start time by `next.config.mjs`. |

Local setup uses `frontend/.env.local`:

```dotenv
BACKEND_URL=http://localhost:5001
```

Production (Vercel) uses the deployed backend:

```dotenv
BACKEND_URL=https://<render-service>.onrender.com
```

Rules:

- Use the full `https://` URL.
- Do not add a trailing slash.
- Set it before building; changing it requires a new deployment.
- Do not expose it as `NEXT_PUBLIC_BACKEND_URL`; the browser does not need it.
- There are no other environment variables in `frontend/.env.example`.

## Local development

Prerequisites: Node.js 20.9.0 or newer (Next.js 16 requires this; the backend requires 20.19.0 or newer), npm, and a running backend with a seeded database.

```bash
cd frontend
npm install
```

Create the local environment file:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux:

```bash
cp .env.example .env.local
```

Set:

```dotenv
BACKEND_URL=http://localhost:5001
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

The backend must be running at the configured URL. If it is not, protected pages show the session error state and list pages show their retryable error states.

Useful local checks:

- `http://localhost:3000/login` — sign-in page.
- `http://localhost:3000/dashboard` — redirects to `/login` without a session.
- `http://localhost:3000/api/health` — should be proxied to the backend health endpoint.

## Production build

```bash
cd frontend
npm run build
npm start
```

`next start` serves the production build on port 3000 by default.

The Stage 7 production build produced these route entries:

```text
○ /
○ /_not-found
○ /dashboard
○ /doctors
ƒ /doctors/[id]
○ /icon.svg
○ /login
○ /patients
ƒ /patients/[id]
```

`○` routes are prerendered; `ƒ` routes are server-rendered on demand. The build requires `BACKEND_URL` to be available when `next.config.mjs` is evaluated, especially on Vercel.

## Testing and verification

The only frontend scripts in `package.json` are:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint with `eslint-config-next/core-web-vitals` |

There is **no** `npm test`, unit-test runner, or committed end-to-end test suite in this package. Browser regression scripts used during earlier stages were external tooling and are not part of this repository.

Recommended verification sequence after a change:

```bash
npm run lint
npm run build
```

Then run the app against a seeded backend and manually exercise:

1. Unauthenticated redirect from `/dashboard` to `/login`.
2. Login, dashboard load, and browser refresh (session persistence).
3. Doctor list search/filter/sort/pagination.
4. Doctor create, edit, delete guard, and detail-page patient assignment/removal.
5. Patient list search/filter/sort/pagination.
6. Patient create, edit, delete, and generated patient code.
7. Sign out and confirm protected pages redirect to `/login`.

The backend also provides proxy/auth verification scripts; see `backend/README.md`.

## Vercel configuration

No `vercel.json` is required. Vercel detects Next.js and uses the standard build.

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework preset | Next.js |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | Default Next.js output |
| Node.js version | 20.9.0 or newer (use a version that also satisfies the backend if you deploy both) |

### Environment variable

Add `BACKEND_URL` in Vercel for the environments you deploy:

```dotenv
BACKEND_URL=https://<render-service>.onrender.com
```

- Set it for **Production**.
- Set it for **Preview** only if preview deployments should reach a backend. If previews are used, the backend must also allow the preview origins.
- Use the exact Render HTTPS URL, no trailing slash.
- Redeploy after changing it.

### Backend origin matching

The backend checks the `Origin` header on mutating requests (`POST`, `PUT`, `PATCH`, and `DELETE`). The Vercel production origin must be present in the backend's `CLIENT_ORIGINS` exactly:

```dotenv
CLIENT_ORIGINS=https://doctor-tracker.vercel.app
```

Do not include a trailing slash. If you use a custom domain or preview URLs, add each origin as a comma-separated entry. A mismatch produces `403 Request origin is not allowed.` on mutations, even when reads and login appear to work.

### Deployment steps

1. Import the repository into Vercel.
2. Set the root directory to `frontend`.
3. Add `BACKEND_URL` for Production (and Preview if needed).
4. Deploy.
5. Copy the resulting Vercel origin into the backend's `CLIENT_ORIGINS` and restart/redeploy the backend.
6. Test login, dashboard load, and one mutation from the deployed frontend.
7. Confirm the backend health endpoint reports `database: "connected"`.

No Vercel deployment was performed during Stage 7.

## Known limitations

- No frontend unit, integration, or committed end-to-end test suite.
- Session state is checked on page load; there is no background refresh or silent token renewal.
- The JWT expires after the backend's configured lifetime (12 hours by default), requiring a new sign-in.
- No public sign-up, password reset, or account-management UI.
- Search and pagination are delegated to the backend; the frontend does not cache pages between route changes.
- `BACKEND_URL` is build-time configuration. A stale value can only be fixed by rebuilding/redeploying.
- Browser regression evidence from earlier stages was produced with external scripts, not with a committed test harness.
- Production deployment on Vercel has not been performed or verified.
