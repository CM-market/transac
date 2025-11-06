# MinIO Integration for Product Images

## Overview

This document describes the integration between Transac and MinIO for storing product images. MinIO is an S3-compatible object storage service that provides a reliable and scalable solution for storing media files.

## Configuration

The MinIO integration is configured through environment variables in the `docker-compose-dev.yml` file:

```yaml
environment:
  S3_BUCKET_NAME: transac-media
  AWS_REGION: us-east-1
  AWS_ACCESS_KEY_ID: minioadmin
  AWS_SECRET_ACCESS_KEY: minioadmin
  AWS_ENDPOINT_URL: http://minio:9000
```

### Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `S3_BUCKET_NAME` | The name of the bucket to store media files | `transac-media` |
| `AWS_REGION` | The AWS region (used for S3 compatibility) | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | The access key for MinIO authentication | `minioadmin` |
| `AWS_SECRET_ACCESS_KEY` | The secret key for MinIO authentication | `minioadmin` |
| `AWS_ENDPOINT_URL` | The URL of the MinIO service | `http://minio:9000` |

## Implementation Details

The MinIO integration is implemented in the `S3MediaStorage` struct in `src/api/media_storage.rs`. This implementation provides methods for uploading and deleting media files.

### Key Features

1. **Automatic Bucket Creation**: The system checks if the configured bucket exists and creates it if necessary.
2. **Organized Storage Structure**: Files are stored in a structured format: `products/{product_id}/media/{media_id}_{filename}.{extension}`.
3. **Error Handling**: Comprehensive error handling with detailed error messages.
4. **Logging**: Detailed logging of all operations for easier debugging.

### Upload Process

1. The product image is first analyzed by the `ImageAnalysisService` to ensure it meets quality and security requirements.
2. If valid, a new UUID is generated for the image.
3. The image is uploaded to MinIO using the S3 API.
4. The product record is updated with the new image ID.

### File Structure

Files are stored in MinIO with the following key structure:

```
products/{product_id}/media/{media_id}_{filename}.{extension}
```

For example:
```
products/550e8400-e29b-41d4-a716-446655440000/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890_product_image.jpg
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure that the MinIO service is running and accessible from the backend service.
2. **Authentication Errors**: Verify that the AWS credentials are correct.
3. **Bucket Not Found**: The system should automatically create the bucket, but if it fails, check the MinIO logs.

### Debugging

Enable debug logging by setting the `RUST_LOG` environment variable to `debug` in the `docker-compose-dev.yml` file:

```yaml
environment:
  RUST_LOG: debug
```

## Testing

You can test the MinIO integration by:

1. Starting the development environment with `docker-compose -f docker-compose-dev.yml up`.
2. Accessing the MinIO console at `http://localhost:9001` (credentials: minioadmin/minioadmin).
3. Creating a product with an image through the API.
4. Verifying that the image appears in the `transac-media` bucket in the MinIO console.