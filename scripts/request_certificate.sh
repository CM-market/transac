#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/request_certificate.sh <domain> <email>
# Example: scripts/request_certificate.sh example.com admin@example.com

DOMAIN=${1:-}
EMAIL=${2:-}

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
	echo "Usage: $0 <domain> <email>"
	exit 1
fi

if [ "$DOMAIN" = "localhost" ] || [[ "$DOMAIN" =~ ^127\.0\.0\.1$ ]]; then
	echo "Let's Encrypt will not issue certificates for localhost/127.0.0.1. Use a real domain."
	exit 1
fi

# Ensure frontend is up to serve ACME http-01 challenge on port 80
if ! docker compose ps frontend >/dev/null 2>&1; then
	echo "Starting frontend to serve ACME challenge..."
	docker compose up -d frontend
fi

# Obtain/renew certificate
docker compose run --rm --entrypoint certbot certbot \
	certonly --webroot \
	--webroot-path /var/www/certbot \
	--agree-tos --no-eff-email \
	-m "$EMAIL" -d "$DOMAIN"

# Render SSL nginx config from template
TMP_CONF=$(mktemp)
sed "s/${SERVER_NAME}/${DOMAIN}/g" frontend/nginx.ssl.template.conf > "$TMP_CONF"

# Copy SSL config into the running frontend container
CID=$(docker compose ps -q frontend)
docker cp "$TMP_CONF" "$CID":/etc/nginx/conf.d/default.conf
rm -f "$TMP_CONF"

# Reload nginx
docker exec "$CID" nginx -s reload

echo "SSL has been configured for https://${DOMAIN}"
