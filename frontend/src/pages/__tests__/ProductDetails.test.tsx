import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductDetails from "../ProductDetails";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dummyProducts } from "@/constants/dummyProducts";

vi.mock("@/contexts/CartContext");
vi.mock("@/contexts/FavoritesContext");
vi.mock("@/openapi-rq/queries");
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockAddToCart = vi.fn();
const mockAddFavorite = vi.fn();
const mockRemoveFavorite = vi.fn();

const queryClient = new QueryClient();

describe("ProductDetails", () => {
  beforeEach(() => {
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      addToCart: mockAddToCart,
    });
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      isFavorite: () => false,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders a loading skeleton initially", () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/1"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders the product details after loading", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/1"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: dummyProducts[0].name }),
      ).toBeInTheDocument();
    });
  });

  it("renders a not found message for an invalid product ID after loading", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/invalid-id"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(
        screen.getByText("productDetails.productNotFound"),
      ).toBeInTheDocument();
    });
  });

  it("calls addToCart when the add to cart button is clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/1"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await screen.findByRole("heading", { name: dummyProducts[0].name });

    const addToCartButtons = screen.getAllByText("productDetails.addToCart");
    fireEvent.click(addToCartButtons[0]);

    expect(mockAddToCart).toHaveBeenCalledWith(dummyProducts[0], 1);
  });

  it("calls addFavorite when the wishlist button is clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/1"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await screen.findByRole("heading", { name: dummyProducts[0].name });

    const wishlistButton = screen.getByText("Heart Icon").closest("button");
    expect(wishlistButton).toBeInTheDocument();
    if (wishlistButton) {
      fireEvent.click(wishlistButton);
    }

    expect(mockAddFavorite).toHaveBeenCalledWith(dummyProducts[0]);
  });

  it("calls removeFavorite when the wishlist button is clicked and item is in wishlist", async () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      isFavorite: () => true, // Product is in favorites
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/1"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await screen.findByRole("heading", { name: dummyProducts[0].name });

    const wishlistButton = screen.getByText("Heart Icon").closest("button");
    expect(wishlistButton).toBeInTheDocument();
    if (wishlistButton) {
      fireEvent.click(wishlistButton);
    }

    expect(mockRemoveFavorite).toHaveBeenCalledWith(dummyProducts[0].id);
  });
});
