pub mod api {
    pub mod image_analysis;
    pub mod media_storage;
    pub mod products;
    pub mod stores;
}

pub mod auth;
pub mod db; // expose entire db module including create_connection
pub mod entity {
    pub mod product;
    pub mod store;
}
pub mod config;
pub mod events;
pub mod migrator; // expose SeaORM migrator module // expose configuration loader
