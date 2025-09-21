use async_trait::async_trait;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_s3::operation::delete_object::DeleteObjectOutput;
use aws_sdk_s3::operation::put_object::PutObjectOutput;
use aws_sdk_s3::Client as S3Client;
use axum::extract::Multipart;
use bytes::Bytes;
use std::env;
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
        let region = RegionProviderChain::default_provider()
            .or_else("us-east-1")
            .region()
            .await;

        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region)
            .load()
            .await;

        let client = S3Client::new(&config);

        // Get bucket name from environment variable or use default
        let bucket_name =
            env::var("S3_BUCKET_NAME").unwrap_or_else(|_| "transac-media".to_string());

        Ok(Self {
            client,
            bucket_name,
        })
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

        // Generate S3 key
        let file_extension = filename.split('.').next_back().unwrap_or("bin");
        let s3_key = format!(
            "products/{}/media_{}.{}",
            product_id,
            Uuid::new_v4(),
            file_extension
        );

        // Upload to S3/MinIO
        let _result: PutObjectOutput = self
            .client
            .put_object()
            .bucket(&self.bucket_name)
            .key(&s3_key)
            .body(file_data.into())
            .content_type("application/octet-stream")
            .send()
            .await
            .map_err(|e| format!("Failed to upload to S3: {e}"))?;

        Ok(s3_key)
    }

    async fn delete_media(&self, media_key: &str) -> Result<(), String> {
        let _result: DeleteObjectOutput = self
            .client
            .delete_object()
            .bucket(&self.bucket_name)
            .key(media_key)
            .send()
            .await
            .map_err(|e| format!("Failed to delete from S3: {e}"))?;

        Ok(())
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

    async fn delete_media(&self, _media_key: &str) -> Result<(), String> {
        // Stub implementation - always succeeds
        Ok(())
    }
}
