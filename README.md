# siteFlow

siteFlow is a field operations app for coordinating highway maintenance work between office staff and field crews. It brings work orders, job updates, inspections, and field evidence into one place.

This is a portfolio project with fictional sample data. It is not affiliated with any transportation agency or company.

## What it does

- Track work orders from assignment through review.
- Give field workers a focused list of jobs, checklists, and job status controls.
- Record inspections, measurements, deficiencies, notes, and photo evidence.
- View operational records on a map and in reports.
- Queue field changes while offline and review or retry them in the Sync Center.
- Separate Field Worker, Supervisor, and Administrator views.

The app can run in a local demo mode using browser storage, or connect to Supabase through the Express API. The demo's GPS capture is simulated near a record's location; it does not request the device's location.

## Built with

React 19, TypeScript, TanStack Start and Router, Vite, Tailwind CSS, and TanStack Query power the frontend. The API uses Express, Zod, and Supabase. Vitest and Bun tests cover the frontend and API.

## Run it locally

Install Node.js 20 or later and [Bun](https://bun.sh/). From the repository root, install the frontend dependencies:

```sh
bun install
```

In a first terminal, start the API:

```sh
cd server
bun install
bun run dev
```

In a second terminal at the repository root, start the frontend:

```sh
bun run dev
```

Open `http://localhost:8080`. The API listens on `http://localhost:4000`; its health endpoint is `http://localhost:4000/api/health`. Stop either process with Ctrl+C in its terminal.

With no Supabase settings, the app uses demo data. To use Supabase, copy `.env.example` to `.env` and `server/.env.example` to `server/.env`, then fill in the Supabase project URL and publishable key in both files. Set the frontend's `VITE_API_URL` to `http://localhost:4000`. Never use a service-role key in the frontend or commit local `.env` files.

To initialize a Supabase project, apply the migrations and sample data with the Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db seed
```

New accounts have the Field Worker role. A trusted account can be promoted in the Supabase SQL Editor by an authorized project owner:

```sql
update public.profiles
set role = 'supervisor'
where email = 'your-email@example.com';
```

## Tests and builds

From the repository root:

```sh
bun run test
bun run build
```

To run the API tests and build:

```sh
cd server
bun run test
bun run build
```

The API checks run without Supabase credentials.

## Deployment

The frontend is configured for Vercel. Import the repository with its root as the project directory, use `bun run build`, and set these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_URL` — the deployed API's HTTPS base URL, without a trailing slash.

The Express API is configured for Render with the repository's `render.yaml` Blueprint. It builds from `server/`, runs the compiled Node server, and checks `/api/health`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the API, and set `CORS_ORIGIN` to the Vercel site origin. Render supplies `PORT`.

After deploying the API, set `VITE_API_URL` in Vercel to the Render service URL and redeploy the frontend. Add the Vercel site URL to the allowed redirect URLs in Supabase Auth. Keep private credentials in the hosting providers' environment settings, not in Git.
