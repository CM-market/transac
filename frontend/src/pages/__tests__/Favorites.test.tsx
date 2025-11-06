import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import Favorites from "../Favorites";
import { useFavorites } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";
import { useTranslation } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/FavoritesContext");
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/components/product/ProductCard", () => ({
  __esModule: true,
  default: ({ product }: { product: { id: string; name: string } }) => (
    <div data-testid={`product-card-${product.id}`}>{product.name}</div>
  ),
}));

const mockProducts = [
  { id: "1", name: "Product 1" },
  { id: "2", name: "Product 2" },
];

describe("Favorites", () => {
  it("renders a list of favorite products", () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      favorites: mockProducts,
    });

    render(
      <Router>
        <CartProvider>
          <Favorites />
        </CartProvider>
      </Router>,
    );

    expect(screen.getByText("favorites.title")).toBeInTheDocument();
    expect(screen.getByTestId("product-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("product-card-2")).toBeInTheDocument();
  });

  it("renders an empty message when there are no favorites", () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      favorites: [],
    });

    render(
      <Router>
        <CartProvider>
          <Favorites />
        </CartProvider>
      </Router>,
    );

    expect(screen.getByText("favorites.emptyMessage")).toBeInTheDocument();
    expect(screen.getByText("favorites.browseProducts")).toBeInTheDocument();
  });

  it('navigates to the products page when the "Browse Products" button is clicked', () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      favorites: [],
    });

    render(
      <Router>
        <CartProvider>
          <Favorites />
        </CartProvider>
      </Router>,
    );

    fireEvent.click(screen.getByText("favorites.browseProducts"));
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });
});
