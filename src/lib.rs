pub mod api {
    pub mod media_storage;
    pub mod products;
    pub mod stores;
    pub mod image_analysis;
}

pub mod auth;
pub mod db; // expose entire db module including create_connection
pub mod entity {
    pub mod product;
    pub mod store;
}
pub mod events;
pub mod migrator; // expose SeaORM migrator module
pub mod config; // expose configuration loader
