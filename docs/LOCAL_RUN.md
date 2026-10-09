# Local Run Guide (Run Transac Locally for Testing)

This guide walks an operator through installing the **Transac** app and running it locally on
their own PC for testing. It covers the three runnable pieces:

| Piece      | Tech            | Port(s)                          |
|------------|-----------------|----------------------------------|
| Backend    | Rust (Axum)     | `3001` (`/healthz`, `/api/v1/*`) |
| Frontend   | React + Vite    | `5174` (dev), `3000` (Compose)   |
| Database   | PostgreSQL 16   | `5432`                           |
| Storage    | MinIO (S3)      | `9000` (API), `9001` (console)   |

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md). This document is only about
running locally for testing and development.

---

## 1. Prerequisites

Install these tools on your machine before starting:

- **git** — to clone the repository.
- **Docker** and **Docker Compose** — required to run PostgreSQL and MinIO (and optionally
  the whole stack) via the provided Compose files.
- **Rust toolchain** (via [rustup](https://rustup.rs)) — required to build and run the
  backend from source (`cargo run`). Stable is fine.
- **Node.js ≥ 18** and **npm** — required to run the frontend. The project does not pin an
  exact engine version, but Node 18+ is a safe baseline for the Vite/React toolchain.
  - Install frontend dependencies with `npm install` inside `frontend/`.
- **PostgreSQL client tools** (`psql`) — only needed if you run migrations manually with
  `scripts/run_migrations.sh`. Not required if you let the backend auto-migrate on startup.

> Docker is the quickest way to get PostgreSQL and MinIO. If you prefer to run PostgreSQL and
> MinIO natively, adjust the `.env` values accordingly — the steps below assume the provided
> Compose services.

---

## 2. Clone the repository

```sh
git clone <your-repo-url> transac
cd transac
```

---

## 3. Option A — Fastest: run the full stack with Docker Compose

The provided `docker-compose-dev.yml` brings up PostgreSQL, MinIO (with bucket bootstrap),
the backend, and the frontend together.

1. **Create your environment file** from the example:

   ```sh
   cp .env.example .env
   ```

2. **Set the required variables** in `.env`. At minimum make sure these are present and
   consistent so the Compose services can talk to each other:

   - `DATABASE_URL` — used by the backend inside Compose. The Compose file derives a sensible
     default, but the `.env.example` you just copied ships
     `DATABASE_URL=postgres://transac_user:password@localhost:5432/transac_db`, whose user and
     host do **not** match the `db` service. Set it explicitly to the exact value below so the
     backend reaches the in-network `db` host with the Compose-provisioned credentials:

     ```
     DATABASE_URL=postgres://user:password@db:5432/transac_db
     ```
   - `POSTGRES_USER` / `POSTGRES_PASSWORD` — default to `user` / `password` in the Compose
     files. Keep these consistent with `DATABASE_URL`.
   - MinIO / S3 variables — `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `AWS_ACCESS_KEY_ID`,
     `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL`, `S3_BUCKET_NAME`. The Compose defaults
     (`minioadmin` / `minioadmin`, bucket `transac-media`) work out of the box for local use.
   - `JWT_SECRET` — set any value for local testing.

   > Note: `.env.example` ships `DATABASE_URL` with user `transac_user`. That user does **not**
   > match the PostgreSQL user (`user`) that the Compose `db` service provisions by default.
   > For the Compose paths in this guide, use `user:password` in `DATABASE_URL` (or change
   > `POSTGRES_USER`/`POSTGRES_PASSWORD` to match your `DATABASE_URL`). See
   > [Troubleshooting](#62-database-connection-failed) below.

3. **Build and start everything:**

   ```sh
   docker compose -f docker-compose-dev.yml up --build
   ```

   The first build will take a while (Rust backend compile + frontend Node build).

4. **Verify it is running:**

   - Backend health: <http://localhost:3001/healthz> → returns `ok`
   - Swagger/OpenAPI docs: <http://localhost:3001/api-docs>
   - Frontend: <http://localhost:3000>
   - MinIO console: <http://localhost:9001> (login `minioadmin` / `minioadmin`)
   - PostgreSQL: `localhost:5432`

5. **Stop / tear down:**

   ```sh
   # Stop containers (keep volumes)
   docker compose -f docker-compose-dev.yml down

   # Stop containers and remove volumes (fresh start)
   docker compose -f docker-compose-dev.yml down -v
   ```

> The Compose frontend proxies API calls to the backend automatically. Keep `VITE_TRANSAC_*
> WEBAUTH_*` values set for web-auth (see Option B for the variable names).

---

## 4. Option B — Local development (recommended for testing)

This is the recommended path for iterating on code: run the infrastructure (PostgreSQL +
MinIO) in Docker, then run the backend and frontend directly on your host.

### 4.1 Start the infrastructure

```sh
docker compose -f docker-compose-dev.yml up -d db minio minio-mc
```

- `db` — PostgreSQL 16 on `localhost:5432` (user `user`, password `password`, db `transac_db`).
- `minio` — MinIO on `localhost:9000` / `9001`.
- `minio-mc` — one-shot bootstrap that creates the `transac-media` bucket and marks it public
  (run again with `up minio-mc` if the bucket is missing).

### 4.2 Configure the backend environment

Create `.env` at the repository root from the example, then override `DATABASE_URL` so it
matches the Compose PostgreSQL user:

```sh
cp .env.example .env
```

Edit `.env`:

- Set `DATABASE_URL=postgres://user:password@localhost:5432/transac_db`
  (note the host is `localhost`, not `db`, because the backend runs on your host).
- Set `RUN_MIGRATIONS_ON_START=true` so the backend applies schema migrations automatically on
  startup. The code default is `false` (`src/config.rs`) — for a host-run backend you **must** set
  it to `true` explicitly or the schema will not be created and the app will fail on first use.
- MinIO defaults (`AWS_ACCESS_KEY_ID=minioadmin`, `AWS_SECRET_ACCESS_KEY=minioadmin`,
  `AWS_ENDPOINT_URL=http://localhost:9000`, `S3_BUCKET_NAME=transac-media`) work as-is.
- Set `JWT_SECRET` to any value for local testing.

### 4.3 Run the backend

```sh
cargo run
```

or explicitly:

```sh
cargo run --bin transac
```

The backend binds to port `3001`. Give it a moment on first start — it connects to
PostgreSQL and applies migrations. Verify with <http://localhost:3001/healthz> (should return
`ok`) and view the API docs at <http://localhost:3001/api-docs>.

### 4.4 Run the frontend

```sh
cd frontend
npm install      # fetches dependencies and runs OpenAPI codegen
```

Create `frontend/.env.local` so Vite has the two required web-auth variables:

```sh
VITE_TRANSAC_WEBAUTH_RP_ID=dev-id
VITE_TRANSAC_WEBAUTH_RP_NAME=Transac Dev
```

Then start the dev server:

```sh
npm run dev
```

Open <http://localhost:5174>. The Vite dev server proxies `/api`, `/healthz`, `/api-docs`, and
`/swagger-ui` to the backend at `http://localhost:3001` automatically.

---

## 5. Database migrations

There are two ways to keep the database schema current:

1. **Auto-migrate on backend startup** (simplest): set `RUN_MIGRATIONS_ON_START=true` in
   `.env`. The backend applies all SeaORM migrations when it starts (`src/migrator.rs`).
2. **Manual SQL migrations**: use the provided script (requires `psql`):

   ```sh
   ./scripts/run_migrations.sh
   ```

   For the specific `image_id` column fix on the `products` table, follow the canonical
   instructions in [`scripts/README_MIGRATION.md`](../scripts/README_MIGRATION.md) — that is the
   only authoritative location for that doc (there is no `docs/README_MIGRATION.md`).

---

## 6. Verification checklist

1. Backend is healthy: `curl http://localhost:3001/healthz` returns `ok`.
2. API docs load: <http://localhost:3001/api-docs> and <http://localhost:3001/swagger-ui>.
3. Frontend loads: <http://localhost:5174> (Option B) or <http://localhost:3000> (Option A).
4. MinIO console reachable at <http://localhost:9001>.
5. Frontend can reach the backend: create/read data through the UI; confirm API requests proxy
   successfully (no CORS/network errors in the browser console).

---

## 7. Troubleshooting

### 7.1 Port already in use

Ports used: `5432`, `3000`, `3001`, `5174`, `9000`, `9001`. If one is taken (e.g. another
PostgreSQL or dev server is running), either stop the conflicting process or change the port
in `docker-compose-dev.yml` / `.env` / `frontend/vite.config.*`.

### 7.2 Database connection failed

```
DATABASE_URL must be set in environment
```

The backend loads `.env` from the repository root. Ensure `.env` exists and `DATABASE_URL` is
set and reachable.

```
connection refused / password authentication failed
```

Double-check the credentials in `DATABASE_URL` match the PostgreSQL instance you are using:

- Compose `db` service provisions `user` / `password` by default.
- `.env.example` ships `DATABASE_URL` with user `transac_user`, which does **not** match the
  Compose PostgreSQL user. For local Compose usage, set
  `DATABASE_URL=postgres://user:password@localhost:5432/transac_db`, or change
  `POSTGRES_USER` / `POSTGRES_PASSWORD` to match your `DATABASE_URL`.

### 7.3 Migrations not applied

If tables/columns are missing, run `RUN_MIGRATIONS_ON_START=true` and restart the backend, or
apply manually with `./scripts/run_migrations.sh`. See
[`scripts/README_MIGRATION.md`](../scripts/README_MIGRATION.md) for the `image_id` fix.

### 7.4 MinIO bucket missing

If uploads fail with a "bucket not found" error, (re)create the bucket by running the
bootstrap service:

```sh
docker compose -f docker-compose-dev.yml up minio-mc
```

then confirm `AWS_ENDPOINT_URL` points at `http://localhost:9000` and `S3_BUCKET_NAME` matches
(`transac-media`).

### 7.5 Frontend codegen / missing OpenAPI client

If the frontend fails to build with missing generated API code, re-run the codegen from
`frontend/`:

```sh
npm install
npm run codegen
```

### 7.6 WebAuthn / RP ID mismatch in dev

Frontend web-auth uses `VITE_TRANSAC_WEBAUTH_RP_ID` and `VITE_TRANSAC_WEBAUTH_RP_NAME`
(`frontend/src/utils/projectEnvVariables.ts`). If authentication behaves unexpectedly in dev,
make sure `frontend/.env.local` defines both and that the RP ID matches the origin you are
accessing (e.g. `localhost`).

### 7.7 RUST_LOG / diagnostics

Set `RUST_LOG=debug` (or `transac=info`) in `.env` for more backend logging to diagnose
startup or request issues.
