## Docker Compose Deployment

### Prerequisites
- Docker and Docker Compose installed

### Services
- Postgres `db` on internal network
- MinIO `minio` with console on 9001 and S3 on 9000; `minio-mc` job ensures bucket `transac-media`
- Rust backend `backend` (Axum) on port 3001 (internal), connects to Postgres and MinIO
- Frontend `frontend` (Nginx) on port 8080, proxies `/api` and `/swagger-ui` to backend, serves SPA and `/openapi.json`

### Environment
Copy and adapt values into your shell or a `.env` file before running compose:

```bash
export DATABASE_URL=postgres://user:password@db:5432/transac_db
export POW_DIFFICULTY=4
export POW_TIMEOUT_MINUTES=10
export RUST_LOG=info

export S3_BUCKET_NAME=transac-media
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin
export AWS_ENDPOINT_URL=http://minio:9000

export VITE_TRANSAC_WEBAUTH_RP_ID=localhost
export VITE_TRANSAC_WEBAUTH_RP_NAME="Transac Dev"
```

### Build and Run

```bash
docker compose build --pull
docker compose up -d
```

### Access
- Frontend: http://localhost:8080
- API health: http://localhost:8080/healthz (proxied)
- Swagger UI: http://localhost:8080/swagger-ui
- MinIO console: http://localhost:9001 (user/pass: `minioadmin`/`minioadmin`)

### Notes
- Frontend determines API base from current origin and proxies via Nginx.
- Backend exposes OpenAPI at `/api-docs/openapi.json` but the frontend ships `/openapi.json` statically; you can update it during CI if needed.
- Adjust Postgres credentials or ports as required.
