pub mod api {
    pub mod media_storage;
    pub mod products;
    pub mod stores;
    pub mod image_analysis;
}

pub mod auth;
pub mod db {
    pub mod products;
    pub mod stores;
}
pub mod entity {
    pub mod product;
    pub mod store;
}
pub mod events;
