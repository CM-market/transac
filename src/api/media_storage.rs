use async_trait::async_trait;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_s3::Client as S3Client;
use axum::extract::Multipart;
use bytes::Bytes;
use std::env;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;

#[async_trait]
pub trait MediaStorage {
    #[allow(dead_code)]
    async fn upload_media(
        &self,
        product_id: Uuid,
        multipart: &mut Multipart,
    ) -> Result<String, String>;

    #[allow(dead_code)]
    async fn upload_media_data(
        &self,
        product_id: Uuid,
        file_name: &str,
        file_data: &[u8],
        content_type: &str,
        image_id: Option<Uuid>,
    ) -> Result<String, String>;

    #[allow(dead_code)]
    async fn delete_media(&self, media_key: &str) -> Result<(), String>;
}

// S3/MinIO implementation
pub struct S3MediaStorage {
    client: S3Client,
    bucket_name: String,
}

#[allow(dead_code)]
impl S3MediaStorage {
    pub async fn new() -> Result<Self, String> {
        // Get credentials from environment variables
        let access_key = env::var("AWS_ACCESS_KEY_ID")
            .map_err(|_| "AWS_ACCESS_KEY_ID environment variable not set".to_string())?;
        let secret_key = env::var("AWS_SECRET_ACCESS_KEY")
            .map_err(|_| "AWS_SECRET_ACCESS_KEY environment variable not set".to_string())?;

        // Get endpoint URL from environment variable (for MinIO)
        let endpoint_url =
            env::var("AWS_ENDPOINT_URL").unwrap_or_else(|_| "http://localhost:9000".to_string());

        // Get region from environment variable or use default
        let region_name = env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());

        let region = RegionProviderChain::default_provider()
            .or_else(aws_config::Region::new(region_name.clone()))
            .region()
            .await;

        // Build AWS config with explicit credentials and endpoint
        let credentials = aws_sdk_s3::config::Credentials::new(
            access_key, secret_key, None,     // session_token
            None,     // expiry
            "static", // provider_name
        );

        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region)
            .endpoint_url(&endpoint_url)
            .credentials_provider(credentials)
            .load()
            .await;

        // Create S3 client with force path style for MinIO compatibility
        let s3_config = aws_sdk_s3::config::Builder::from(&config)
            .force_path_style(true)
            .build();

        let client = S3Client::from_conf(s3_config);

        // Get bucket name from environment variable or use default
        let bucket_name =
            env::var("S3_BUCKET_NAME").unwrap_or_else(|_| "transac-media".to_string());

        // Log connection details (without sensitive info)
        tracing::info!(
            "Initializing S3 media storage with bucket: {}, region: {}, endpoint: {}",
            bucket_name,
            region_name,
            &endpoint_url
        );

        // One-time diagnostic: list buckets visible to the client
        match client.list_buckets().send().await {
            Ok(output) => {
                let names: Vec<String> = output
                    .buckets()
                    .iter()
                    .filter_map(|b| b.name().map(|s| s.to_string()))
                    .collect();
                tracing::info!("S3 list_buckets returned: {:?}", names);
            }
            Err(e) => {
                tracing::warn!("S3 list_buckets failed: {:?}", e);
            }
        }

        // Create a new instance
        let storage = Self {
            client,
            bucket_name,
        };

        // Verify bucket exists and is accessible
        storage.ensure_bucket_exists().await?;

        Ok(storage)
    }

    /// Ensures the configured bucket exists and is accessible
    /// Creates the bucket if it doesn't exist
    async fn ensure_bucket_exists(&self) -> Result<(), String> {
        // Check if bucket exists
        let exists = match self
            .client
            .head_bucket()
            .bucket(&self.bucket_name)
            .send()
            .await
        {
            Ok(_) => {
                tracing::info!("Bucket '{}' exists and is accessible", self.bucket_name);
                true
            }
            Err(e) => {
                tracing::warn!(
                    "Bucket '{}' check failed: {} | debug={:?}",
                    self.bucket_name,
                    e,
                    e
                );
                false
            }
        };

        // If bucket doesn't exist, try to create it
        if !exists {
            tracing::info!("Attempting to create bucket '{}'", self.bucket_name);
            match self
                .client
                .create_bucket()
                .bucket(&self.bucket_name)
                .send()
                .await
            {
                Ok(_) => {
                    tracing::info!("Successfully created bucket '{}'", self.bucket_name);

                    // Wait until the bucket is actually available (MinIO may take a moment)
                    if let Err(e) = self
                        .wait_for_bucket_availability(Duration::from_secs(5))
                        .await
                    {
                        tracing::error!(
                            "Bucket '{}' not available after creation: {}",
                            self.bucket_name,
                            e
                        );
                        return Err(format!(
                            "Bucket '{}' not available after creation: {}",
                            self.bucket_name, e
                        ));
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to create bucket '{}': {:?}", self.bucket_name, e);
                    return Err(format!(
                        "Failed to create bucket '{}': {}",
                        self.bucket_name, e
                    ));
                }
            }
        }

        Ok(())
    }

    /// Wait for the bucket to become available by retrying head_bucket for up to `timeout`.
    async fn wait_for_bucket_availability(&self, timeout: Duration) -> Result<(), String> {
        let start = std::time::Instant::now();
        let mut attempts: u32 = 0;
        loop {
            attempts += 1;
            match self
                .client
                .head_bucket()
                .bucket(&self.bucket_name)
                .send()
                .await
            {
                Ok(_) => {
                    tracing::info!(
                        "Bucket '{}' became available after {} attempt(s)",
                        self.bucket_name,
                        attempts
                    );
                    return Ok(());
                }
                Err(e) => {
                    if start.elapsed() >= timeout {
                        return Err(format!(
                            "Bucket '{}' not available within {:?}: {}",
                            self.bucket_name, timeout, e
                        ));
                    }
                    // Exponential backoff: 50ms, 100ms, 200ms, ... up to 800ms
                    let backoff_ms = 50u64.saturating_mul(1u64 << (attempts.min(4) - 1));
                    tracing::debug!(
                        "Waiting for bucket '{}', retrying in {}ms (attempt #{})",
                        self.bucket_name,
                        backoff_ms,
                        attempts
                    );
                    sleep(Duration::from_millis(backoff_ms)).await;
                }
            }
        }
    }

    async fn extract_file_from_multipart(
        &self,
        multipart: &mut Multipart,
    ) -> Result<(String, Bytes), String> {
        let mut file_data = Vec::new();
        let mut filename = String::new();

        while let Some(mut field) = multipart
            .next_field()
            .await
            .map_err(|e| format!("Failed to read multipart field: {e}"))?
        {
            if field.name() == Some("file") {
                filename = field.file_name().unwrap_or("unknown").to_string();

                while let Some(chunk) = field
                    .chunk()
                    .await
                    .map_err(|e| format!("Failed to read chunk: {e}"))?
                {
                    file_data.extend_from_slice(&chunk);
                }
                break;
            }
        }

        if file_data.is_empty() {
            return Err("No file data found in multipart".to_string());
        }

        Ok((filename, Bytes::from(file_data)))
    }
}

#[async_trait]
impl MediaStorage for S3MediaStorage {
    async fn upload_media(
        &self,
        product_id: Uuid,
        multipart: &mut Multipart,
    ) -> Result<String, String> {
        // Extract file from multipart
        let (filename, file_data) = self.extract_file_from_multipart(multipart).await?;

        // Use the common implementation
        self.upload_media_data(
            product_id,
            &filename,
            &file_data,
            "application/octet-stream",
            None,
        )
        .await
    }

    async fn upload_media_data(
        &self,
        product_id: Uuid,
        file_name: &str,
        file_data: &[u8],
        content_type: &str,
        image_id: Option<Uuid>,
    ) -> Result<String, String> {
        if file_data.is_empty() {
            return Err("Cannot upload empty file data".to_string());
        }

        // Generate S3 key with organized folder structure
        let file_extension = file_name.split('.').next_back().unwrap_or("bin");
        let media_id = image_id.unwrap_or_else(Uuid::new_v4);
        let s3_key = format!(
            "products/{}/media/{}_{}.{}",
            product_id,
            media_id,
            file_name.split('.').next().unwrap_or("image"),
            file_extension
        );

        tracing::info!(
            "Uploading file '{}' ({} bytes) for product {} to bucket '{}', key '{}'",
            file_name,
            file_data.len(),
            product_id,
            self.bucket_name,
            s3_key
        );

        // Prepare upload request
        // Upload the file to S3/MinIO (MinIO may not support canned ACLs; rely on bucket policy)
        let result = self
            .client
            .put_object()
            .bucket(&self.bucket_name)
            .key(&s3_key)
            .body(file_data.to_vec().into())
            .content_type(content_type)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("S3 put_object failed: {:?}", e);
                format!("Failed to upload to S3: {e}")
            })?;

        tracing::info!(
            "Successfully uploaded file to S3. ETag: {:?}",
            result.e_tag()
        );

        Ok(s3_key)
    }

    async fn delete_media(&self, media_key: &str) -> Result<(), String> {
        if media_key.is_empty() {
            return Err("Cannot delete with empty media key".to_string());
        }

        tracing::info!(
            "Deleting media with key '{}' from bucket '{}'",
            media_key,
            self.bucket_name
        );

        // Prepare delete request
        let delete_request = self
            .client
            .delete_object()
            .bucket(&self.bucket_name)
            .key(media_key);

        // Execute delete
        match delete_request.send().await {
            Ok(_) => {
                tracing::info!(
                    "Successfully deleted media with key '{}' from bucket '{}'",
                    media_key,
                    self.bucket_name
                );
                Ok(())
            }
            Err(e) => {
                let error_msg = format!("Failed to delete from S3: {e}");
                tracing::error!("{}", error_msg);
                Err(error_msg)
            }
        }
    }
}

// Stub implementation for development/testing
pub struct StubMediaStorage;

#[async_trait]
impl MediaStorage for StubMediaStorage {
    async fn upload_media(
        &self,
        product_id: Uuid,
        _multipart: &mut Multipart,
    ) -> Result<String, String> {
        // Return a stubbed S3 key for development
        Ok(format!(
            "products/{}/media_stub_{}.jpg",
            product_id,
            Uuid::new_v4()
        ))
    }

    async fn upload_media_data(
        &self,
        product_id: Uuid,
        _file_name: &str,
        _file_data: &[u8],
        _content_type: &str,
        image_id: Option<Uuid>,
    ) -> Result<String, String> {
        // Return a stubbed S3 key for development
        Ok(format!(
            "products/{}/media_stub_{}.jpg",
            product_id,
            image_id.unwrap_or_else(Uuid::new_v4)
        ))
    }

    async fn delete_media(&self, _media_key: &str) -> Result<(), String> {
        // Stub implementation - always succeeds
        Ok(())
    }
}
