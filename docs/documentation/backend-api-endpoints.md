# Backend API Endpoints Documentation

This document consolidates the expected backend API endpoints as consumed by the frontend application. These endpoints are crucial for various features such as product listing, product details, cart management, favorites management, and search functionality.

## 1. Product Endpoints

### 1.1. Get All Products

*   **Endpoint:** `GET /api/products`
*   **Description:** Retrieves a list of all products, with optional filtering and pagination.
*   **Query Parameters:**
    *   `category` (optional): Filters products by category.
    *   `search` (optional): Filters products by name or description.
    *   `minPrice`, `maxPrice` (optional): Filters products by price range.
    *   `sortBy` (optional): Sorts products (e.g., `price_asc`, `price_desc`, `rating`).
    *   `page`, `limit` (optional): For pagination.
*   **Response (200 OK):**
    ```json
    {
      "products": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "price": number,
          "images": ["string"], // URLs to product images
          "stock": number,
          "discount": number, // Percentage
          "supplier": {
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
          "shippingInfo": "string"
        }
      ],
      "totalCount": number,
      "currentPage": number,
      "totalPages": number
    }
    ```

### 1.2. Get Product by ID

*   **Endpoint:** `GET /api/products/{id}`
*   **Description:** Retrieves detailed information for a single product by its ID.
*   **Path Parameters:**
    *   `id` (required): The unique identifier of the product.
*   **Response (200 OK):**
    ```json
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "price": number,
      "images": ["string"], // URLs to product images
      "stock": number,
      "discount": number, // Percentage
      "supplier": {
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
      "shippingInfo": "string"
    }
    ```
*   **Response (404 Not Found):** If the product with the given ID does not exist.

## 2. Cart Endpoints (Expected for Server-Side Cart)

While the current frontend cart implementation is client-side, these endpoints would be expected for a server-side cart.

### 2.1. Add Product to Cart

*   **Endpoint:** `POST /api/cart/add`
*   **Description:** Adds a product to the user's server-side cart.
*   **Request Body:**
    ```json
    {
      "productId": "string",
      "quantity": number
    }
    ```
*   **Response (200 OK):** Updated cart details or success message.

### 2.2. Update Product Quantity in Cart

*   **Endpoint:** `PUT /api/cart/update`
*   **Description:** Updates the quantity of a product in the user's server-side cart.
*   **Request Body:**
    ```json
    {
      "productId": "string",
      "quantity": number
    }
    ```
*   **Response (200 OK):** Updated cart details or success message.

### 2.3. Remove Product from Cart

*   **Endpoint:** `DELETE /api/cart/remove/{productId}`
*   **Description:** Removes a product from the user's server-side cart.
*   **Path Parameters:**
    *   `productId` (required): The ID of the product to remove.
*   **Response (200 OK):** Updated cart details or success message.

### 2.4. Get Cart Contents

*   **Endpoint:** `GET /api/cart`
*   **Description:** Retrieves the current contents of the user's server-side cart.
*   **Response (200 OK):**
    ```json
    {
      "items": [
        {
          "productId": "string",
          "name": "string",
          "price": number,
          "quantity": number,
          "imageUrl": "string"
        }
      ],
      "totalItems": number,
      "totalPrice": number
    }
    ```

### 2.5. Clear Cart

*   **Endpoint:** `DELETE /api/cart/clear`
*   **Description:** Clears all items from the user's server-side cart.
*   **Response (200 OK):** Success message.

## 3. Favorites Endpoints (Expected for Server-Side Favorites)

While the current frontend favorites implementation is client-side, these endpoints would be expected for server-side favorites management.

### 3.1. Add Product to Favorites

*   **Endpoint:** `POST /api/favorites/add`
*   **Description:** Adds a product to the user's server-side favorites list.
*   **Request Body:**
    ```json
    {
      "productId": "string"
    }
    ```
*   **Response (200 OK):** Updated favorites list or success message.

### 3.2. Remove Product from Favorites

*   **Endpoint:** `DELETE /api/favorites/remove/{productId}`
*   **Description:** Removes a product from the user's server-side favorites list.
*   **Path Parameters:**
        *   `productId` (required): The ID of the product to remove.
*   **Response (200 OK):** Updated favorites list or success message.

### 3.3. Get User Favorites

*   **Endpoint:** `GET /api/favorites`
*   **Description:** Retrieves the current list of the user's server-side favorited products.
*   **Response (200 OK):**
    ```json
    {
      "items": [
        {
          "id": "string",
          "name": "string",
          "price": number,
          "imageUrl": "string"
        }
      ],
      "totalItems": number
    }