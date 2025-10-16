# Cart Feature Documentation

This document details the implementation, flow, and testing of the Cart feature in the frontend application.

## 1. Overview

The Cart feature allows users to collect products they intend to purchase. It provides functionalities to add products, update quantities, remove products, and clear the entire cart. The cart's state is persisted locally using `localStorage`.

## 2. Implementation Details

### 2.1. Components Involved

*   [`frontend/src/pages/Cart.tsx`](frontend/src/pages/Cart.tsx): The main page component that displays the contents of the user's shopping cart. It lists each item, its quantity, and total price, and provides controls for managing cart items.
*   [`frontend/src/contexts/CartContext.tsx`](frontend/src/contexts/CartContext.tsx): The central context for managing the global cart state. It provides functions like `addToCart`, `removeFromCart`, `updateQuantity`, and `clearCart`. It also handles `localStorage` persistence.
*   [`frontend/src/components/product/ProductCard.tsx`](frontend/src/components/product/ProductCard.tsx): Includes an "Add to Cart" button that interacts with the `CartContext`.
*   [`frontend/src/pages/ProductDetails.tsx`](frontend/src/pages/ProductDetails.tsx): The product details page allows users to add a product to the cart, often with a specified quantity, interacting with the `CartContext`.
*   [`frontend/src/components/MainNavbar.tsx`](frontend/src/components/MainNavbar.tsx): Displays a cart icon with a count of items in the cart, providing a quick overview and navigation to the cart page.
*   [`frontend/src/types/product.ts`](frontend/src/types/product.ts): Defines the `Product` interface, which is extended by `CartItem` to include quantity.

### 2.2. Data Flow

1.  **Initialization:** When the application loads, `CartContext` attempts to load the cart state from `localStorage`. If no data is found, it initializes an empty cart.
2.  **Adding to Cart:**
    *   From `ProductCard.tsx` or `ProductDetails.tsx`, when a user clicks "Add to Cart", the `addToCart` function from `useCart` hook is called with the product details and desired quantity.
    *   `CartContext` updates its internal state, adding the product or incrementing its quantity if it already exists.
    *   The updated cart state is then saved to `localStorage`.
3.  **Updating Quantity:** On the `Cart.tsx` page, users can change the quantity of an item. This calls the `updateQuantity` function from `useCart`, which updates the cart state and `localStorage`.
4.  **Removing from Cart:** On the `Cart.tsx` page, users can remove an item. This calls the `removeFromCart` function from `useCart`, which removes the item from the cart state and `localStorage`.
5.  **Clearing Cart:** On the `Cart.tsx` page, a "Clear Cart" option calls the `clearCart` function from `useCart`, emptying the cart state and `localStorage`.
6.  **Display:** `Cart.tsx` consumes the cart state from `CartContext` to render the list of items, their quantities, and the total price. `MainNavbar.tsx` also consumes the cart state to display the total number of items in the cart.

### 2.3. State Management

*   **`CartContext`:** Manages the global state of the shopping cart. It uses `useState` to hold the array of `CartItem` objects.
*   **`localStorage`:** The cart state is persisted to `localStorage` using `useEffect` hooks within `CartContext.tsx`. This ensures that cart contents are retained even if the user closes and reopens the browser.

## 3. How to Test

### 3.1. Unit Tests (Example for `CartContext.tsx`)

(This section is a placeholder. You would typically use a testing library like Jest.)

```typescript
// frontend/src/contexts/CartContext.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { CartProvider, useCart } from './CartContext';
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

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear(); // Clear localStorage before each test
  });

  it('initializes with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('adds a product to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => {
      result.current.addToCart(mockProduct, 1);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].name).toBe(mockProduct.name);
    expect(result.current.cartItems[0].quantity).toBe(1);
    expect(result.current.cartCount).toBe(1);
    expect(result.current.cartTotal).toBe(mockProduct.price);
  });

  it('increments quantity if product already in cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.addToCart(mockProduct, 1);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
    expect(result.current.cartCount).toBe(2);
    expect(result.current.cartTotal).toBe(mockProduct.price * 2);
  });

  it('removes a product from the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.removeFromCart(mockProduct.id);
    });

    expect(result.current.cartItems).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('updates product quantity in the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.updateQuantity(mockProduct.id, 3);
    });

    expect(result.current.cartItems[0].quantity).toBe(3);
    expect(result.current.cartCount).toBe(3);
    expect(result.current.cartTotal).toBe(mockProduct.price * 3);
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.clearCart();
    });

    expect(result.current.cartItems).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('persists cart state to localStorage', () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => {
      result.current.addToCart(mockProduct, 1);
    });

    unmount(); // Simulate component unmount to trigger useEffect save

    const storedCart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    expect(storedCart).toHaveLength(1);
    expect(storedCart[0].id).toBe(mockProduct.id);
  });

  it('loads cart state from localStorage on initialization', () => {
    localStorage.setItem('cartItems', JSON.stringify([{ ...mockProduct, quantity: 2 }]));

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
    expect(result.current.cartCount).toBe(2);
  });
});
```

### 3.2. End-to-End Tests (Example using Cypress)

(This section is a placeholder. You would typically use an E2E testing framework like Cypress.)

```javascript
// cypress/e2e/cart.cy.js
describe('Cart Page', () => {
  beforeEach(() => {
    // Add a product to cart before visiting the cart page for most tests
    cy.visit('/products');
    cy.get('.product-card').first().find('button:contains("Add to Cart")').click();
    cy.visit('/cart');
  });

  it('should display cart items', () => {
    cy.get('.cart-item').should('have.length.greaterThan', 0);
    cy.get('.cart-item-name').should('not.be.empty');
    cy.get('.cart-item-price').should('not.be.empty');
  });

  it('should update item quantity', () => {
    cy.get('.cart-item-quantity-input').clear().type('2');
    cy.get('.cart-item-quantity-input').should('have.value', '2');
    // Assert total price updates
  });

  it('should remove an item from the cart', () => {
    cy.get('.cart-item-remove-button').first().click();
    cy.get('.cart-item').should('have.length', 0);
    cy.get('.cart-empty-message').should('be.visible');
  });

  it('should clear the entire cart', () => {
    cy.get('button:contains("Clear Cart")').click();
    cy.get('.cart-item').should('have.length', 0);
    cy.get('.cart-empty-message').should('be.visible');
  });

  it('should persist cart items after refresh', () => {
    cy.reload();
    cy.get('.cart-item').should('have.length.greaterThan', 0);
  });
});
```

## 4. Backend Endpoints (Expected)

While the current frontend cart implementation is client-side (using `localStorage`), a full-fledged e-commerce application would typically interact with backend endpoints for cart management, especially for checkout and order processing.

*   **`POST /api/cart/add`**:
    *   **Description:** Adds a product to the user's server-side cart.
    *   **Request Body:**
        ```json
        {
          "productId": "string",
          "quantity": number
        }
        ```
    *   **Response (200 OK):** Updated cart details or success message.
*   **`PUT /api/cart/update`**:
    *   **Description:** Updates the quantity of a product in the user's server-side cart.
    *   **Request Body:**
        ```json
        {
          "productId": "string",
          "quantity": number
        }
        ```
    *   **Response (200 OK):** Updated cart details or success message.
*   **`DELETE /api/cart/remove/{productId}`**:
    *   **Description:** Removes a product from the user's server-side cart.
    *   **Path Parameters:**
        *   `productId` (required): The ID of the product to remove.
    *   **Response (200 OK):** Updated cart details or success message.
*   **`GET /api/cart`**:
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
*   **`DELETE /api/cart/clear`**:
    *   **Description:** Clears all items from the user's server-side cart.
    *   **Response (200 OK):** Success message.