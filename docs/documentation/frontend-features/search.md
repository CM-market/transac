# Search Feature Documentation

This document details the implementation, flow, and testing of the Search feature in the frontend application.

## 1. Overview

The Search feature allows users to find products by entering keywords. It provides a way to filter the product catalog based on user input, typically displaying relevant products on a dedicated search results page or dynamically updating a product list.

## 2. Implementation Details

### 2.1. Components Involved

*   [`frontend/src/pages/Search.tsx`](frontend/src/pages/Search.tsx): The main page component responsible for displaying search results. It likely takes search query parameters from the URL and fetches/filters products accordingly.
*   [`frontend/src/components/MainNavbar.tsx`](frontend/src/components/MainNavbar.tsx): (Assumed) Typically includes a search input field that allows users to enter their search query and initiate a search.
*   [`frontend/src/components/ProductCard.tsx`](frontend/src/components/ProductCard.tsx): Used to render individual product results within the search results page.
*   [`frontend/src/constants/dummyProducts.ts`](frontend/src/constants/dummyProducts.ts): Provides static dummy product data. For search, this data would be filtered based on the search query. In a production environment, this data would be fetched from a backend API.
*   [`frontend/src/types/product.ts`](frontend/src/types/product.ts): Defines the TypeScript interface for a `Product` object.

### 2.2. Data Flow

1.  **Search Input:** A user enters a search query into the search input field (e.g., in `MainNavbar.tsx`).
2.  **Navigation:** Upon submitting the search query, the application navigates to the `Search.tsx` page, passing the query as a URL parameter (e.g., `/search?query=keyword`).
3.  **Data Fetching/Filtering:**
    *   The `Search.tsx` component extracts the search query from the URL.
    *   It then filters the available product data (currently `dummyProducts`) based on this query, matching against product names, descriptions, or other relevant fields.
    *   In a real application, this would involve an API call to a backend search endpoint (e.g., `GET /api/products?search=keyword`).
4.  **Rendering:** `Search.tsx` maps over the filtered array of products and renders a `ProductCard` component for each matching product.
5.  **User Interaction:** Users can click on individual `ProductCard` components to navigate to the `ProductDetails` page for that product.

### 2.3. State Management

*   **`Search.tsx`:** Manages the search query extracted from the URL and the filtered list of products to be displayed.
*   **URL Parameters:** The search query itself is often managed via URL query parameters, allowing for shareable search results.

## 3. How to Test

### 3.1. Unit Tests (Example for `Search.tsx`)

(This section is a placeholder. You would typically use a testing library like Jest and React Testing Library.)

```typescript
// frontend/src/pages/Search.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Search from './Search';
import { dummyProducts } from '@/constants/dummyProducts';

// Mock the useParams hook if needed, or use MemoryRouter with initialEntries
// For search, we typically use useSearchParams or location.search

describe('Search Page', () => {
  it('renders filtered products based on search query', async () => {
    const searchQuery = 'laptop'; // Assuming dummyProducts has a laptop
    render(
      <MemoryRouter initialEntries={[`/search?query=${searchQuery}`]}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Expect products containing 'laptop' to be in the document
      const laptopProducts = dummyProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      laptopProducts.forEach(product => {
        expect(screen.getByText(product.name)).toBeInTheDocument();
      });
      // Ensure other products are not present (optional, but good for specificity)
      const nonLaptopProducts = dummyProducts.filter(p => !p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      nonLaptopProducts.forEach(product => {
        expect(screen.queryByText(product.name)).not.toBeInTheDocument();
      });
    });
  });

  it('renders "No products found" if no matches', async () => {
    const searchQuery = 'nonexistentproduct123';
    render(
      <MemoryRouter initialEntries={[`/search?query=${searchQuery}`]}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it('renders all products if no search query is provided', async () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      dummyProducts.forEach(product => {
        expect(screen.getByText(product.name)).toBeInTheDocument();
      });
    });
  });
});
```

### 3.2. End-to-End Tests (Example using Cypress)

(This section is a placeholder. You would typically use an E2E testing framework like Cypress.)

```javascript
// cypress/e2e/search.cy.js
describe('Search Feature', () => {
  it('should allow searching for products from the navbar', () => {
    cy.visit('/'); // Assuming search bar is in the main navbar
    cy.get('[data-testid="search-input"]').type('camera'); // Assuming a data-testid for search input
    cy.get('[data-testid="search-button"]').click(); // Assuming a data-testid for search button
    cy.url().should('include', '/search?query=camera');
    cy.get('.product-card').should('have.length.greaterThan', 0);
    cy.get('.product-card-name').first().should('contain', 'Camera');
  });

  it('should display "No products found" for an invalid search query', () => {
    cy.visit('/');
    cy.get('[data-testid="search-input"]').type('xyznonexistentproduct');
    cy.get('[data-testid="search-button"]').click();
    cy.url().should('include', '/search?query=xyznonexistentproduct');
    cy.get('.product-card').should('not.exist');
    cy.get('.no-results-message').should('be.visible'); // Assuming a no results message
  });

  it('should display all products if search query is empty', () => {
    cy.visit('/search'); // Directly visit search page without query
    cy.get('.product-card').should('have.length.greaterThan', 0); // All dummy products
  });
});
```

## 4. Backend Endpoints (Expected)

The frontend expects the following (or similar) API endpoints from the backend for search functionality:

*   **`GET /api/products`**:
    *   **Description:** Retrieves a list of products, with optional filtering by search query.
    *   **Query Parameters:**
        *   `search` (optional): A keyword or phrase to search for within product names, descriptions, or other relevant fields.
        *   `category` (optional): Can be combined with `search` to narrow down results.
        *   `page`, `limit` (optional): For pagination of search results.
    *   **Response (200 OK):**
        ```json
        {
          "products": [
            {
              "id": "string",
              "name": "string",
              "description": "string",
              "price": number,
              "images": ["string"],
              "stock": number,
              "discount": number,
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