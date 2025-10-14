# Deployment Guide for transac.site

This guide explains how to deploy the Transac application using the provided GitHub Actions workflow and Docker Compose configuration.

---

## 1. Prerequisites

- **Production server** (Ubuntu recommended) with:
  - Docker and Docker Compose installed
  - Sufficient disk space and memory
  - Open ports: 80, 443, 3001, 9000, 9001 (as needed)
- **SSL certificates** for `transac.site` placed at `/etc/ssl/certs/transac.site/fullchain.pem` and `/etc/ssl/certs/transac.site/privkey.pem` on the server
- **GitHub repository access** with Actions enabled and secrets configured:
  - `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` (for SSH deployment)
  - `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `JWT_SECRET`, `VITE_TRANSAC_WEBAUTH_RP_ID`, `VITE_TRANSAC_WEBAUTH_RP_NAME` (as needed)

---

## 2. CI/CD Workflow

### Build and Push Images

- On every push to `main`, GitHub Actions will:
  - Build Docker images for `frontend` and `backend`
  - Tag and push them to GitHub Container Registry (`ghcr.io`)

### Deploy Job

- The workflow will:
  - SSH into your production server
  - Pull the latest code and images
  - Generate `docker-compose.prod.yml` with correct image tags and environment
  - Mount SSL certs for HTTPS
  - Start all services with Docker Compose
  - Perform a health check and rollback if needed

---

## 3. Manual Deployment Steps

If you need to deploy manually or troubleshoot:

1. **Clone the repository** (if not already present):

   ```sh
   git clone https://github.com/<your-org>/<your-repo>.git
   cd <your-repo>
   ```

2. **Ensure SSL certs are present:**

   - Place `fullchain.pem` and `privkey.pem` for `transac.site` in `/etc/ssl/certs/transac.site/` on the server.

3. **Set up environment variables** (if not using GitHub Actions):

   - Create a `.env` file or export variables as needed for secrets.

4. **Pull latest images:**

   ```sh
   docker compose -f docker-compose.yml pull
   ```

5. **Start services:**

   ```sh
   docker compose -f docker-compose.yml up -d
   ```

6. **Verify deployment:**

   - Visit `https://transac.site` in your browser.
   - Check logs with `docker compose logs -f`.

---

## 4. Service Overview

- **Frontend**: React app served by Nginx, HTTPS enabled via mounted certs.
- **Backend**: Rust API, listens on port 3001.
- **Database**: Postgres, internal only.
- **MinIO**: S3-compatible storage, internal only.
- **Certbot/letsencrypt**: Used for certificate renewal (if configured).

---

## 5. Troubleshooting

- **SSL Issues**: Ensure certs are present and permissions are correct.
- **Health Check Failures**: Check backend logs and database connectivity.
- **Image Pull Issues**: Ensure GitHub Container Registry access and authentication.

---

## 6. Useful Commands

- Restart all services:

  ```sh
  docker compose -f docker-compose.yml restart
  ```

- View logs for a service:

  ```sh
  docker compose logs -f frontend
  ```

- Renew certificates (if using certbot):

  ```sh
  docker compose run --rm certbot renew
  ```

---

## 7. References

- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- [`docker-compose.yml`](../docker-compose.yml)
- [frontend/nginx.ssl.template.conf](../frontend/nginx.ssl.template.conf)

---

**Deployment is now fully automated and production-ready for transac.site.**
