# Product Listing Feature Documentation

This document details the implementation, flow, and testing of the Product Listing feature in the frontend application.

## 1. Overview

The Product Listing feature displays a catalog of available products to users. It allows users to browse products, view essential information (name, price, image, rating, supplier), and interact with "Add to Cart" and "Like" functionalities directly from the listing.

## 2. Implementation Details

### 2.1. Components Involved

*   [`frontend/src/pages/ProductList.tsx`](frontend/src/pages/ProductList.tsx): The main page component responsible for fetching and displaying the list of products. It orchestrates the `FilterSidebar` and `ProductCard` components.
*   [`frontend/src/components/product/ProductCard.tsx`](frontend/src/components/product/ProductCard.tsx): A reusable component that renders an individual product's information in a card format. It includes "Add to Cart" and "Like" buttons.
*   [`frontend/src/components/product/FilterSidebar.tsx`](frontend/src/components/product/FilterSidebar.tsx): (Assumed, based on common marketplace features) A sidebar component for filtering products by various criteria (e.g., category, price range).
*   [`frontend/src/constants/dummyProducts.ts`](frontend/src/constants/dummyProducts.ts): Provides static dummy product data for demonstration and development purposes. In a production environment, this data would be fetched from a backend API.
*   [`frontend/src/types/product.ts`](frontend/src/types/product.ts): Defines the TypeScript interface for a `Product` object, ensuring type safety across the application.

### 2.2. Data Flow

1.  **Data Fetching:** The `ProductList.tsx` component (or a custom hook it uses) is responsible for fetching product data. Currently, it uses `dummyProducts` from [`frontend/src/constants/dummyProducts.ts`](frontend/src/constants/dummyProducts.ts). In a real application, this would involve an API call to a backend endpoint.
2.  **Filtering (Optional):** If a `FilterSidebar` is implemented, it would update the state in `ProductList.tsx` to filter the displayed products based on user selections.
3.  **Rendering:** `ProductList.tsx` maps over the array of products and renders a `ProductCard` component for each product.
4.  **User Interaction:**
    *   **"Add to Cart"**: When the "Add to Cart" button in a `ProductCard` is clicked, it dispatches an action to the `CartContext` (via the `useCart` hook) to add the product to the global cart state.
    *   **"Like"**: When the "Like" (Heart) button in a `ProductCard` is clicked, it dispatches an action to the `FavoritesContext` (via the `useFavorites` hook) to add or remove the product from the global favorites state.
    *   **Product Details Navigation**: Clicking anywhere else on the `ProductCard` navigates the user to the `ProductDetails` page for that specific product.

### 2.3. State Management

*   **`ProductList.tsx`:** Manages the list of products to be displayed and any filtering parameters.
*   **`CartContext`:** Manages the global state of the shopping cart. The `useCart` hook provides `addToCart` functionality. The cart state is persisted to `localStorage`.
*   **`FavoritesContext`:** Manages the global state of liked products. The `useFavorites` hook provides `addFavorite`, `removeFavorite`, and `isFavorite` functionalities. The favorites state is persisted to `localStorage`.

## 3. How to Test

### 3.1. Unit Tests (Example for `ProductCard.tsx`)

(This section is a placeholder. You would typically use a testing library like Jest and React Testing Library.)

```typescript
// frontend/src/components/product/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from './ProductCard';
import { CartProvider } from '@/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { Product } from '@/types/product';

const mockProduct: Product = {
  id: "1",
  name: "Test Product",
  description: "A description",
  price: 1000,
  images: ["/placeholder.svg"],
  stock: 10,
  discount: 0,
  supplier: { name: "Test Supplier", isVerified: true },
  rating: 4.5,
  reviews: 50,
  category: "Electronics",
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(
      <Router>
        <CartProvider>
          <FavoritesProvider>
            <ProductCard product={mockProduct} />
          </FavoritesProvider>
        </CartProvider>
      </Router>
    );

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(`${mockProduct.price.toLocaleString()} FCFA`)).toBeInTheDocument();
    expect(screen.getByAltText(mockProduct.name)).toBeInTheDocument();
  });

  it('adds product to cart when "Add to Cart" button is clicked', () => {
    const { getByRole } = render(
      <Router>
        <CartProvider>
          <FavoritesProvider>
            <ProductCard product={mockProduct} />
          </FavoritesProvider>
        </CartProvider>
      </Router>
    );

    const addToCartButton = getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    // Assert that the cart context's addToCart function was called
    // This would typically involve mocking the context or checking a visual indicator
  });

  it('toggles product in favorites when "Like" button is clicked', () => {
    const { getByRole } = render(
      <Router>
        <CartProvider>
          <FavoritesProvider>
            <ProductCard product={mockProduct} />
          </FavoritesProvider>
        </CartProvider>
      </Router>
    );

    const likeButton = getByRole('button', { name: /heart/i }); // Assuming Heart icon has accessible name
    fireEvent.click(likeButton);
    // Assert that the favorites context's addFavorite/removeFavorite was called
  });
});
```

### 3.2. End-to-End Tests (Example using Cypress)

(This section is a placeholder. You would typically use an E2E testing framework like Cypress.)

```javascript
// cypress/e2e/product-listing.cy.js
describe('Product Listing Page', () => {
  beforeEach(() => {
    cy.visit('/products');
  });

  it('should display a list of products', () => {
    cy.get('.product-card').should('have.length.greaterThan', 0);
  });

  it('should navigate to product details when a product card is clicked', () => {
    cy.get('.product-card').first().click();
    cy.url().should('include', '/product/');
  });

  it('should add a product to the cart', () => {
    cy.get('.product-card').first().find('button:contains("Add to Cart")').click();
    cy.get('.cart-count').should('contain', '1'); // Assuming a cart count indicator in navbar
  });

  it('should add/remove a product from favorites', () => {
    cy.get('.product-card').first().find('button[aria-label="heart"]').click();
    cy.get('.favorites-count').should('contain', '1'); // Assuming a favorites count indicator
    cy.get('.product-card').first().find('button[aria-label="heart"]').click();
    cy.get('.favorites-count').should('contain', '0');
  });
});
```

## 4. Backend Endpoints (Expected)

The frontend expects the following (or similar) API endpoints from the backend for product listing:

*   **`GET /api/products`**:
    *   **Description:** Retrieves a list of all products.
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