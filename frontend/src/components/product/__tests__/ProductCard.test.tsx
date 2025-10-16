import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import ProductCard from "../ProductCard";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTranslation } from "react-i18next";
import { vi } from "vitest";
import { Product } from "@/types/product";

vi.mock("@/contexts/CartContext");
vi.mock("@/contexts/FavoritesContext");
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count: number }) =>
      options ? `${key} ${options.count}` : key,
  }),
}));

const mockAddToCart = vi.fn();
const mockAddFavorite = vi.fn();
const mockRemoveFavorite = vi.fn();

const mockProduct: Product = {
  id: "1",
  name: "Test Product",
  description: "Test Description",
  price: 100,
  discount: 10,
  stock: 5,
  images: ["test-image.jpg"],
  rating: 4,
  reviews: 10,
  category: "Test Category",
  supplier: {
    name: "Test Supplier",
    isVerified: true,
  },
};

describe("ProductCard", () => {
  beforeEach(() => {
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      addToCart: mockAddToCart,
    });
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      isFavorite: () => false,
    });
  });

  it("renders product information correctly", () => {
    render(
      <Router>
        <ProductCard product={mockProduct} onAddToCart={mockAddToCart} />
      </Router>,
    );

    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText(/product.productCard.reviews/)).toBeInTheDocument();
    expect(screen.getByText("90 FCFA")).toBeInTheDocument();
    expect(screen.getByText("100 FCFA")).toBeInTheDocument();
    expect(
      screen.getByText(/product.productCard.limitedStock/),
    ).toBeInTheDocument();
  });

  it("calls addToCart when the add to cart button is clicked", () => {
    render(
      <Router>
        <ProductCard product={mockProduct} onAddToCart={mockAddToCart} />
      </Router>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /product.productCard.addToCart/i }),
    );
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it("calls addFavorite when the wishlist button is clicked and the product is not a favorite", () => {
    render(
      <Router>
        <ProductCard product={mockProduct} onAddToCart={mockAddToCart} />
      </Router>,
    );

    fireEvent.click(screen.getByRole("button", { name: /heart/i }));
    expect(mockAddFavorite).toHaveBeenCalledWith(mockProduct);
  });

  it("calls removeFavorite when the wishlist button is clicked and the product is a favorite", () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      isFavorite: () => true,
    });

    render(
      <Router>
        <ProductCard product={mockProduct} onAddToCart={mockAddToCart} />
      </Router>,
    );

    fireEvent.click(screen.getByRole("button", { name: /heart/i }));
    expect(mockRemoveFavorite).toHaveBeenCalledWith(mockProduct.id);
  });
});
