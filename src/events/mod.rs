use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tracing::{info, warn};

/// Event types for the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    ProductCreated,
    ProductUpdated,
    ProductDeleted,
    ProductMediaUploaded,
    ProductMediaReplaced,
    ProductMediaDeleted,
}

/// Event data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: Uuid,
    pub event_type: EventType,
    pub entity_id: Uuid,
    pub data: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

/// Event handler trait
pub trait EventHandler: Send + Sync {
    async fn handle_event(&self, event: &Event) -> Result<(), String>;
}

/// Event dispatcher for managing and dispatching events
pub struct EventDispatcher {
    handlers: Vec<Box<dyn EventHandler>>,
}

impl EventDispatcher {
    pub fn new() -> Self {
        Self {
            handlers: Vec::new(),
        }
    }

    pub fn add_handler(&mut self, handler: Box<dyn EventHandler>) {
        self.handlers.push(handler);
    }

    pub async fn dispatch(&self, event: Event) -> Result<(), String> {
        info!("Dispatching event: {:?}", event);
        
        for handler in &self.handlers {
            if let Err(e) = handler.handle_event(&event).await {
                warn!("Event handler failed: {}", e);
                // Continue with other handlers even if one fails
            }
        }
        
        Ok(())
    }
}

impl Default for EventDispatcher {
    fn default() -> Self {
        Self::new()
    }
}

/// Create a new event
pub fn create_event(event_type: EventType, entity_id: Uuid, data: serde_json::Value) -> Event {
    Event {
        id: Uuid::new_v4(),
        event_type,
        entity_id,
        data,
        timestamp: Utc::now(),
    }
}

/// Logging event handler (for development)
pub struct LoggingEventHandler;

#[async_trait::async_trait]
impl EventHandler for LoggingEventHandler {
    async fn handle_event(&self, event: &Event) -> Result<(), String> {
        info!("Event received: {:?}", event);
        Ok(())
    }
}

/// WebSocket event handler (placeholder for future implementation)
pub struct WebSocketEventHandler;

#[async_trait::async_trait]
impl EventHandler for WebSocketEventHandler {
    async fn handle_event(&self, event: &Event) -> Result<(), String> {
        // TODO: Implement WebSocket broadcasting
        info!("WebSocket event (not implemented): {:?}", event);
        Ok(())
    }
}
