# Product Details Feature Documentation

This document details the implementation, flow, and testing of the Product Details feature in the frontend application.

## 1. Overview

The Product Details feature provides a dedicated page for users to view comprehensive information about a single product. This includes detailed descriptions, multiple images, pricing, stock availability, supplier information, ratings, reviews, and options to add the product to the cart or mark it as a favorite. It also displays related products.

## 2. Implementation Details

### 2.1. Components Involved

*   [`frontend/src/pages/ProductDetails.tsx`](frontend/src/pages/ProductDetails.tsx): The main page component responsible for fetching and displaying the details of a specific product. It orchestrates various sub-components like `ProductImageGallery`, `ProductInfo`, `ProductDescription`, `Reviews`, and `RelatedProducts`.
*   [`frontend/src/components/product/ProductImageGallery.tsx`](frontend/src/components/product/ProductImageGallery.tsx): Displays a carousel or gallery of product images.
*   [`frontend/src/components/product/ProductInfo.tsx`](frontend/src/components/product/ProductInfo.tsx): Displays core product information such as name, price, rating, supplier, and includes "Add to Cart" and "Like" buttons.
*   [`frontend/src/components/product/ProductDescription.tsx`](frontend/src/components/product/ProductDescription.tsx): Renders the detailed description of the product.
*   [`frontend/src/components/product/Reviews.tsx`](frontend/src/components/product/Reviews.tsx): Displays customer reviews and ratings for the product.
*   [`frontend/src/components/product/RelatedProducts.tsx`](frontend/src/components/product/RelatedProducts.tsx): Shows a list of products related to the current product, typically based on category or tags.
*   [`frontend/src/types/product.ts`](frontend/src/types/product.ts): Defines the TypeScript interface for a `Product` object, ensuring type safety across the application.
*   [`frontend/src/contexts/CartContext.tsx`](frontend/src/contexts/CartContext.tsx): Provides the `addToCart` function to add products to the global cart state.
*   [`frontend/src/contexts/FavoritesContext.tsx`](frontend/src/contexts/FavoritesContext.tsx): Provides `addFavorite`, `removeFavorite`, and `isFavorite` functions to manage the global favorites state.

### 2.2. Data Flow

1.  **URL Parameter Extraction:** When the `ProductDetails.tsx` page loads, it extracts the product ID from the URL parameters (e.g., `/product/:id`).
2.  **Data Fetching:** Using the extracted product ID, the `ProductDetails.tsx` component (or a custom hook it uses) fetches the specific product's data. Currently, it retrieves data from `dummyProducts` in [`frontend/src/constants/dummyProducts.ts`](frontend/src/constants/dummyProducts.ts). In a real application, this would involve an API call to a backend endpoint like `GET /api/products/:id`.
3.  **Related Products Fetching:** The `RelatedProducts` component filters the `dummyProducts` based on the current product's category to display related items.
4.  **Component Composition:** The fetched product data is then passed as props to the various sub-components (`ProductImageGallery`, `ProductInfo`, etc.) for rendering.
5.  **User Interaction:**
    *   **"Add to Cart"**: The `ProductInfo` component's "Add to Cart" button dispatches an action to the `CartContext` (via the `useCart` hook) to add the product (with a specified quantity) to the global cart state.
    *   **"Like"**: The `ProductInfo` component's "Like" (Heart) button dispatches an action to the `FavoritesContext` (via the `useFavorites` hook) to add or remove the product from the global favorites state.

### 2.3. State Management

*   **`ProductDetails.tsx`:** Manages the currently displayed product's data and potentially the selected quantity for adding to cart.
*   **`CartContext`:** Manages the global state of the shopping cart. The `useCart` hook provides `addToCart` functionality. The cart state is persisted to `localStorage`.
*   **`FavoritesContext`:** Manages the global state of liked products. The `useFavorites` hook provides `addFavorite`, `removeFavorite`, and `isFavorite` functionalities. The favorites state is persisted to `localStorage`.

## 3. How to Test

### 3.1. Unit Tests (Example for `ProductDetails.tsx`)

(This section is a placeholder. You would typically use a testing library like Jest and React Testing Library.)

```typescript
// frontend/src/pages/ProductDetails.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetails from './ProductDetails';
import { CartProvider } from '@/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { dummyProducts } from '@/constants/dummyProducts';

// Mock the useParams hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ productId: '1' }), // Mocking for product with ID '1'
}));

describe('ProductDetails', () => {
  it('renders product details correctly for a given product ID', async () => {
    render(
      <MemoryRouter initialEntries={['/product/1']}>
        <Routes>
          <Route path="/product/:productId" element={
            <CartProvider>
              <FavoritesProvider>
                <ProductDetails />
              </FavoritesProvider>
            </CartProvider>
          } />
        </Routes>
      </MemoryRouter>
    );

    // Assuming dummyProducts[0] is the product with ID '1'
    const product = dummyProducts.find(p => p.id === '1');

    await waitFor(() => {
      expect(screen.getByText(product.name)).toBeInTheDocument();
      expect(screen.getByText(`${product.price.toLocaleString()} FCFA`)).toBeInTheDocument();
      expect(screen.getByText(product.description)).toBeInTheDocument();
      expect(screen.getByText(/add to cart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/heart/i)).toBeInTheDocument();
    });
  });

  it('displays "Product not found" if product ID is invalid', async () => {
    // Mock useParams to return an invalid ID
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ productId: 'invalid-id' }),
    }));

    render(
      <MemoryRouter initialEntries={['/product/invalid-id']}>
        <Routes>
          <Route path="/product/:productId" element={
            <CartProvider>
              <FavoritesProvider>
                <ProductDetails />
              </FavoritesProvider>
            </CartProvider>
          } />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/product not found/i)).toBeInTheDocument();
    });
  });
});
```

### 3.2. End-to-End Tests (Example using Cypress)

(This section is a placeholder. You would typically use an E2E testing framework like Cypress.)

```javascript
// cypress/e2e/product-details.cy.js
describe('Product Details Page', () => {
  beforeEach(() => {
    cy.visit('/product/1'); // Assuming product with ID '1' exists
  });

  it('should display product details', () => {
    cy.get('h1').should('not.be.empty'); // Product name
    cy.get('.product-price').should('not.be.empty');
    cy.get('.product-description').should('not.be.empty');
    cy.get('.product-image-gallery').should('exist');
  });

  it('should add product to cart', () => {
    cy.get('button:contains("Add to Cart")').click();
    cy.get('.cart-count').should('contain', '1'); // Assuming a cart count indicator in navbar
  });

  it('should toggle product in favorites', () => {
    cy.get('button[aria-label="heart"]').click();
    cy.get('.favorites-count').should('contain', '1'); // Assuming a favorites count indicator
    cy.get('button[aria-label="heart"]').click();
    cy.get('.favorites-count').should('contain', '0');
  });

  it('should display related products', () => {
    cy.get('.related-products-section').should('exist');
    cy.get('.related-products-section .product-card').should('have.length.greaterThan', 0);
  });
});
```

## 4. Backend Endpoints (Expected)

The frontend expects the following (or similar) API endpoints from the backend for product details:

*   **`GET /api/products/{id}`**:
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