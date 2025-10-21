# Frontend Architecture

This document outlines the architecture of the frontend application, focusing on its structure, key technologies, state management, routing, and internationalization.

## 1. Overview

The frontend is a Single Page Application (SPA) built with React and TypeScript. It leverages a component-based architecture, where the UI is composed of reusable and independent components. The application is designed to be responsive, user-friendly, and maintainable.

## 2. Key Technologies

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A superset of JavaScript that adds static typing, improving code quality and maintainability.
*   **React Router DOM:** For declarative routing within the application.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
*   **Shadcn/ui:** A collection of reusable components built with Radix UI and Tailwind CSS.
*   **React i18next:** For internationalization (i18n) to support multiple languages.
*   **Vite:** A fast build tool that provides a lightning-fast development experience.
*   **TanStack Query (React Query):** For data fetching, caching, and state management of asynchronous data.

## 3. Project Structure

The project follows a modular structure, organizing code by feature and type.

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Images, icons, etc.
│   ├── components/         # Reusable UI components (e.g., Button, Card)
│   │   ├── product/        # Product-specific components (e.g., ProductCard, ProductInfo)
│   │   └── ui/             # Shadcn/ui components
│   ├── contexts/           # React Contexts for global state management (e.g., CartContext, FavoritesContext)
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Layout components (e.g., MainLayout)
│   ├── lib/                # Utility functions and configurations (e.g., queryClient, utils)
│   ├── locales/            # Internationalization translation files
│   ├── pages/              # Top-level pages/views of the application
│   ├── routes/             # Application routing configuration
│   ├── services/           # API service integrations and other external interactions
│   ├── types/              # TypeScript type definitions (e.g., product.ts)
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point of the React application
│   └── ...
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

## 4. State Management

The application utilizes a combination of React's built-in state management features and dedicated contexts for global state:

*   **Local Component State:** Managed using `useState` and `useReducer` for component-specific data.
*   **React Context API:** Used for global state that needs to be accessible by many components without prop-drilling.
    *   **`CartContext`:** Manages the state of the shopping cart, including adding, removing, and updating product quantities. This context also persists its state to `localStorage` to ensure data is not lost on page refresh or navigation.
    *   **`FavoritesContext`:** Manages the state of liked/favorited products. Similar to `CartContext`, it uses `localStorage` for persistence.
    *   **`ThemeContext`:** (Assumed, based on `ThemeToggle` component) Manages the application's theme (e.g., light/dark mode).
*   **TanStack Query (React Query):** Used for managing server-side data, providing powerful caching, background refetching, and synchronization capabilities.

## 5. Routing

The application uses `react-router-dom` for client-side routing.

*   **`AppRoutes.tsx`:** Defines all the application routes, including public and protected routes. It also handles authentication status and renders appropriate components (e.g., `LoadingPage`, `ErrorPage`, `PowScreen`).
*   **`MainLayout.tsx`:** A layout component that wraps common UI elements like the `MainNavbar` and `Footer`, ensuring a consistent layout across different pages.

## 6. Internationalization (i18n)

`react-i18next` is used to support multiple languages. Translation files are located in `frontend/src/locales/en/translation.json` and `frontend/src/locales/fr/translation.json`. The `useTranslation` hook is used in components to access translated strings.

## 7. Component Design Patterns

*   **Atomic Design Principles:** Components are often structured following atomic design principles (atoms, molecules, organisms, templates, pages) to promote reusability and maintainability.
*   **Container/Presentational Components:** Separation of concerns where container components handle logic and data fetching, and presentational components focus solely on rendering UI.
*   **Custom Hooks:** Logic is extracted into custom hooks (e.g., `useProductForm`, `useAuthenticationFlow`) to promote reusability and cleaner component code.

## 8. Data Flow

Data generally flows in a unidirectional manner:

1.  **User Interaction:** Triggers actions (e.g., button click, form submission).
2.  **Component Logic:** Handles the action, potentially updating local state or dispatching actions to a context.
3.  **Context/Hook Logic:** Updates global state or performs asynchronous operations (e.g., API calls).
4.  **State Update:** The updated state triggers re-renders of affected components.
5.  **UI Update:** The UI reflects the new state.

## 9. Testing

(This section is a placeholder and should be filled with actual testing strategies and tools used, e.g., Jest, React Testing Library, Cypress.)

## 10. Deployment

(This section is a placeholder and should be filled with deployment details, e.g., Docker, CI/CD pipelines, hosting provider.)