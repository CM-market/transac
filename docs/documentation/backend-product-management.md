# Backend Product Management Documentation

This document outlines the backend's responsibilities and expected API endpoints for managing product data within the e-commerce platform. This includes operations for creating, retrieving, updating, and deleting products.

## 1. Overview

The backend product management system is responsible for storing, organizing, and serving product information. It handles data persistence, validation, and business logic related to products, ensuring data integrity and efficient retrieval for frontend applications.

## 2. Database Schema (Expected)

The backend is expected to interact with a database schema that includes at least a `products` table and potentially a `stores` table (for supplier information).

### 2.1. `products` Table

| Column Name    | Data Type      | Constraints                               | Description                                     |
| :------------- | :------------- | :---------------------------------------- | :---------------------------------------------- |
| `id`           | UUID/String    | PRIMARY KEY, NOT NULL                     | Unique identifier for the product               |
| `name`         | String         | NOT NULL                                  | Name of the product                             |
| `description`  | Text           | NOT NULL                                  | Detailed description of the product             |
| `price`        | Decimal        | NOT NULL, > 0                             | Price of the product                            |
| `images`       | JSON/Array of Strings | NOT NULL                                  | URLs or paths to product images                 |
| `stock`        | Integer        | NOT NULL, >= 0                            | Current stock quantity                          |
| `discount`     | Decimal        | DEFAULT 0, >= 0, <= 100                   | Discount percentage                             |
| `supplier_id`  | UUID/String    | FOREIGN KEY (references `stores.id`), NOT NULL | ID of the store/supplier selling the product    |
| `rating`       | Decimal        | DEFAULT 0, >= 0, <= 5                     | Average rating of the product                   |
| `reviews_count`| Integer        | DEFAULT 0, >= 0                           | Number of reviews                               |
| `category`     | String         | NOT NULL                                  | Product category (e.g., "Electronics", "Books") |
| `tags`         | JSON/Array of Strings |                                           | Keywords or tags associated with the product    |
| `materials`    | String         |                                           | Materials used in the product                   |
| `dimensions`   | String         |                                           | Product dimensions/size                         |
| `return_policy`| Text           |                                           | Product return policy                           |
| `shipping_info`| Text           |                                           | Shipping information for the product            |
| `created_at`   | Timestamp      | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of product creation                   |
| `updated_at`   | Timestamp      | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                        |

### 2.2. `stores` Table (Simplified for Product Context)

| Column Name    | Data Type      | Constraints                               | Description                                     |
| :------------- | :------------- | :---------------------------------------- | :---------------------------------------------- |
| `id`           | UUID/String    | PRIMARY KEY, NOT NULL                     | Unique identifier for the store                 |
| `name`         | String         | NOT NULL                                  | Name of the store/supplier                      |
| `is_verified`  | Boolean        | DEFAULT FALSE                             | Indicates if the supplier is verified           |
| `user_id`      | UUID/String    | FOREIGN KEY (references `users.id`), UNIQUE, NOT NULL | ID of the user who owns this store              |

## 3. API Endpoints for Product Management (CRUD)

These endpoints are typically secured and require authentication and authorization (e.g., only sellers or administrators can create/update/delete products).

### 3.1. Create Product

*   **Endpoint:** `POST /api/products`
*   **Description:** Creates a new product entry in the database.
*   **Authentication:** Required (e.g., JWT token for an authenticated seller).
*   **Request Body:**
    ```json
    {
      "name": "string",
      "description": "string",
      "price": number,
      "images": ["string"], // URLs or paths to product images
      "stock": number,
      "discount": number,
      "supplierId": "string", // ID of the seller's store
      "category": "string",
      "tags": ["string"],
      "materials": "string",
      "dimensions": "string",
      "returnPolicy": "string",
      "shippingInfo": "string"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "price": number,
      "images": ["string"],
      "stock": number,
      "discount": number,
      "supplier": {
        "id": "string",
        "name": "string",
        "isVerified": boolean
      },
      "rating": number,
      "reviews": number,
      "category": "string",
      "tags": ["string"],
      "materials": "string",
      "dimensions": "string",
      "returnPolicy": "string",
      "shippingInfo": "string",
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime"
    }
    ```
*   **Response (400 Bad Request):** If input validation fails.
*   **Response (401 Unauthorized):** If authentication fails.
*   **Response (403 Forbidden):** If the authenticated user is not authorized to create products.

### 3.2. Get All Products (as documented in `backend-api-endpoints.md`)

*   **Endpoint:** `GET /api/products`
*   **Description:** Retrieves a list of all products, with optional filtering and pagination.
*   **Query Parameters:** `category`, `search`, `minPrice`, `maxPrice`, `sortBy`, `page`, `limit`.
*   **Response (200 OK):** Array of product objects.

### 3.3. Get Product by ID (as documented in `backend-api-endpoints.md`)

*   **Endpoint:** `GET /api/products/{id}`
*   **Description:** Retrieves detailed information for a single product by its ID.
*   **Path Parameters:** `id`.
*   **Response (200 OK):** Single product object.
*   **Response (404 Not Found):** If the product does not exist.

### 3.4. Update Product

*   **Endpoint:** `PUT /api/products/{id}`
*   **Description:** Updates an existing product's information.
*   **Authentication:** Required (e.g., JWT token for the product's seller or an administrator).
*   **Path Parameters:**
    *   `id` (required): The unique identifier of the product to update.
*   **Request Body:** (Partial update allowed, all fields optional)
    ```json
    {
      "name": "string",
      "description": "string",
      "price": number,
      "images": ["string"],
      "stock": number,
      "discount": number,
      "category": "string",
      "tags": ["string"],
      "materials": "string",
      "dimensions": "string",
      "returnPolicy": "string",
      "shippingInfo": "string"
    }
    ```
*   **Response (200 OK):** Updated product object.
*   **Response (400 Bad Request):** If input validation fails.
*   **Response (401 Unauthorized):** If authentication fails.
*   **Response (403 Forbidden):** If the authenticated user is not authorized to update this product.
*   **Response (404 Not Found):** If the product with the given ID does not exist.

### 3.5. Delete Product

*   **Endpoint:** `DELETE /api/products/{id}`
*   **Description:** Deletes a product from the database.
*   **Authentication:** Required (e.g., JWT token for the product's seller or an administrator).
*   **Path Parameters:**
    *   `id` (required): The unique identifier of the product to delete.
*   **Response (204 No Content):** If the product was successfully deleted.
*   **Response (401 Unauthorized):** If authentication fails.
*   **Response (403 Forbidden):** If the authenticated user is not authorized to delete this product.
*   **Response (404 Not Found):** If the product with the given ID does not exist.

## 4. Business Logic Considerations

*   **Validation:** All incoming product data should be thoroughly validated (e.g., price > 0, stock >= 0, valid image URLs).
*   **Authorization:** Ensure that only authorized users (e.g., the product's owner or an admin) can modify or delete products.
*   **Image Management:** The `images` field typically stores URLs to images hosted on a separate media storage service (e.g., MinIO, S3). The backend might handle the upload process or simply store the provided URLs.
*   **Search Indexing:** For efficient searching, product data might be indexed in a search engine (e.g., Elasticsearch) in addition to the primary database.
*   **Reviews and Ratings:** The backend should manage the aggregation of ratings and reviews, updating the `rating` and `reviews_count` fields on the product.