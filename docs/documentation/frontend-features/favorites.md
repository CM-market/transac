# Favorites Feature Documentation

This document details the implementation, flow, and testing of the Favorites feature in the frontend application.

## 1. Overview

The Favorites feature allows users to mark products they are interested in as "favorites" or "wishlisted." This provides a convenient way for users to keep track of products they might want to purchase later without adding them directly to the cart. The favorites' state is persisted locally using `localStorage`.

## 2. Implementation Details

### 2.1. Components Involved

*   [`frontend/src/pages/Favorites.tsx`](frontend/src/pages/Favorites.tsx): The main page component that displays the list of products the user has marked as favorites. It typically renders `ProductCard` components for each favorited item.
*   [`frontend/src/contexts/FavoritesContext.tsx`](frontend/src/contexts/FavoritesContext.tsx): The central context for managing the global favorites state. It provides functions like `addFavorite`, `removeFavorite`, and `isFavorite`. It also handles `localStorage` persistence.
*   [`frontend/src/components/product/ProductCard.tsx`](frontend/src/components/product/ProductCard.tsx): Includes a "Like" (Heart) button that interacts with the `FavoritesContext` to toggle a product's favorite status.
*   [`frontend/src/pages/ProductDetails.tsx`](frontend/src/pages/ProductDetails.tsx): The product details page includes a "Like" button (often within the `ProductInfo` component) that allows users to mark the currently viewed product as a favorite.
*   [`frontend/src/components/product/ProductInfo.tsx`](frontend/src/components/product/ProductInfo.tsx): Contains the "Like" button and displays the current favorite status of a product.
*   [`frontend/src/components/MainNavbar.tsx`](frontend/src/components/MainNavbar.tsx): Displays a favorites icon (e.g., a heart) with a count of favorited items, providing quick navigation to the favorites page.
*   [`frontend/src/types/product.ts`](frontend/src/types/product.ts): Defines the `Product` interface, which is used for storing favorited products.

### 2.2. Data Flow

1.  **Initialization:** When the application loads, `FavoritesContext` attempts to load the favorites state (an array of product IDs or full product objects) from `localStorage`. If no data is found, it initializes an empty favorites list.
2.  **Toggling Favorite Status:**
    *   From `ProductCard.tsx` or `ProductDetails.tsx` (via `ProductInfo.tsx`), when a user clicks the "Like" button, the `addFavorite` or `removeFavorite` function from `useFavorites` hook is called with the product details.
    *   `FavoritesContext` updates its internal state, adding the product to the favorites list if it's not already there, or removing it if it is.
    *   The updated favorites state is then saved to `localStorage`.
3.  **Checking Favorite Status:** The `isFavorite` function from `useFavorites` is used by `ProductCard.tsx` and `ProductInfo.tsx` to determine if a product is currently favorited, allowing the UI to display the correct icon state (e.g., filled vs. outlined heart).
4.  **Display:** `Favorites.tsx` consumes the favorites state from `FavoritesContext` to render the list of favorited products. `MainNavbar.tsx` also consumes this state to display the total number of favorited items.

### 2.3. State Management

*   **`FavoritesContext`:** Manages the global state of favorited products. It uses `useState` to hold the array of `Product` objects.
*   **`localStorage`:** The favorites state is persisted to `localStorage` using `useEffect` hooks within `FavoritesContext.tsx`. This ensures that favorited products are retained even if the user closes and reopens the browser.

## 3. How to Test

### 3.1. Unit Tests (Example for `FavoritesContext.tsx`)

(This section is a placeholder. You would typically use a testing library like Jest.)

```typescript
// frontend/src/contexts/FavoritesContext.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { FavoritesProvider, useFavorites } from './FavoritesContext';
import { Product } from '@/types/product';

const mockProduct1: Product = {
  id: "1",
  name: "Test Product 1",
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

const mockProduct2: Product = {
  id: "2",
  name: "Test Product 2",
  description: "Another description",
  price: 2000,
  images: ["/placeholder.svg"],
  stock: 5,
  discount: 0,
  supplier: { name: "Test Supplier", isVerified: true },
  rating: 4.0,
  reviews: 30,
  category: "Books",
};

describe('FavoritesContext', () => {
  beforeEach(() => {
    localStorage.clear(); // Clear localStorage before each test
  });

  it('initializes with an empty favorites list', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper: FavoritesProvider });
    expect(result.current.favoriteItems).toEqual([]);
    expect(result.current.favoritesCount).toBe(0);
  });

  it('adds a product to favorites', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper: FavoritesProvider });

    act(() => {
      result.current.addFavorite(mockProduct1);
    });

    expect(result.current.favoriteItems).toHaveLength(1);
    expect(result.current.favoriteItems[0].name).toBe(mockProduct1.name);
    expect(result.current.favoritesCount).toBe(1);
    expect(result.current.isFavorite(mockProduct1.id)).toBe(true);
  });

  it('removes a product from favorites', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper: FavoritesProvider });

    act(() => {
      result.current.addFavorite(mockProduct1);
      result.current.removeFavorite(mockProduct1.id);
    });

    expect(result.current.favoriteItems).toHaveLength(0);
    expect(result.current.favoritesCount).toBe(0);
    expect(result.current.isFavorite(mockProduct1.id)).toBe(false);
  });

  it('does not add duplicate products to favorites', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper: FavoritesProvider });

    act(() => {
      result.current.addFavorite(mockProduct1);
      result.current.addFavorite(mockProduct1); // Try to add again
    });

    expect(result.current.favoriteItems).toHaveLength(1);
    expect(result.current.favoritesCount).toBe(1);
  });

  it('persists favorites state to localStorage', () => {
    const { result, unmount } = renderHook(() => useFavorites(), { wrapper: FavoritesProvider });

    act(() => {
      result.current.addFavorite(mockProduct1);
      result.current.addFavorite(mockProduct2);
    });

    unmount(); // Simulate component unmount to trigger useEffect save

    const storedFavorites = JSON.parse(localStorage.getItem('favoriteItems') || '[]');
    expect(storedFavorites).toHaveLength(2);
    expect(storedFavorites[0].id).toBe(mockProduct1.id);
    expect(storedFavorites[1].id).toBe(mockProduct2.id);
  });

  it('loads favorites state from localStorage on initialization', () => {
    localStorage.setItem('favoriteItems', JSON.stringify([mockProduct1]));

    const { result } = renderHook(() => useFavorites(), { wrapper: FavoritesProvider });

    expect(result.current.favoriteItems).toHaveLength(1);
    expect(result.current.favoriteItems[0].id).toBe(mockProduct1.id);
    expect(result.current.favoritesCount).toBe(1);
  });
});
```

### 3.2. End-to-End Tests (Example using Cypress)

(This section is a placeholder. You would typically use an E2E testing framework like Cypress.)

```javascript
// cypress/e2e/favorites.cy.js
describe('Favorites Page', () => {
  beforeEach(() => {
    // Add a product to favorites before visiting the favorites page for most tests
    cy.visit('/products');
    cy.get('.product-card').first().find('button[aria-label="heart"]').click();
    cy.visit('/favorites');
  });

  it('should display favorited items', () => {
    cy.get('.product-card').should('have.length.greaterThan', 0);
    cy.get('.product-card-name').should('not.be.empty');
  });

  it('should remove an item from favorites', () => {
    cy.get('.product-card').first().find('button[aria-label="heart"]').click(); // Click to unfavorite
    cy.get('.product-card').should('have.length', 0);
    cy.get('.favorites-empty-message').should('be.visible'); // Assuming an empty message
  });

  it('should persist favorited items after refresh', () => {
    cy.reload();
    cy.get('.product-card').should('have.length.greaterThan', 0);
  });

  it('should navigate to product details from favorites', () => {
    cy.get('.product-card').first().click();
    cy.url().should('include', '/product/');
  });
});
```

## 4. Backend Endpoints (Expected)

While the current frontend favorites implementation is client-side (using `localStorage`), a full-fledged e-commerce application would typically interact with backend endpoints for managing user favorites, especially for authenticated users.

*   **`POST /api/favorites/add`**:
    *   **Description:** Adds a product to the user's server-side favorites list.
    *   **Request Body:**
        ```json
        {
          "productId": "string"
        }
        ```
    *   **Response (200 OK):** Updated favorites list or success message.
*   **`DELETE /api/favorites/remove/{productId}`**:
    *   **Description:** Removes a product from the user's server-side favorites list.
    *   **Path Parameters:**
        *   `productId` (required): The ID of the product to remove.
    *   **Response (200 OK):** Updated favorites list or success message.
*   **`GET /api/favorites`**:
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