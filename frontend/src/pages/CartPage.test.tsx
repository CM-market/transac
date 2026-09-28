import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";
import { CartPage } from "./CartPage";
import { useCart, CartContextType } from "../contexts/CartContext";

vi.mock("../contexts/CartContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../contexts/CartContext")>();
  return {
    ...actual,
    useCart: vi.fn(),
  };
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <CartPage />
    </I18nextProvider>,
  );
}

function baseCart(overrides: Partial<CartContextType> = {}): CartContextType {
  return {
    items: [
      {
        productId: "prod-1",
        storeId: "store-1",
        name: "Premium Widget",
        price: 5000,
        quantity: 2,
      },
      {
        productId: "prod-2",
        storeId: "store-2",
        name: "Pro Cable",
        price: 1000,
        quantity: 1,
      },
    ],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clear: vi.fn(),
    totalCount: 3,
    totalPrice: 11000,
    ...overrides,
  };
}

describe("CartPage", () => {
  let cart: CartContextType;

  beforeEach(() => {
    vi.clearAllMocks();
    cart = baseCart();
    (useCart as unknown as ReturnType<typeof vi.fn>).mockReturnValue(cart);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an empty state when the cart has no items", () => {
    (useCart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseCart(),
      items: [],
      totalCount: 0,
      totalPrice: 0,
    });
    renderPage();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it("lists cart items with names, quantities, and prices", () => {
    renderPage();

    expect(screen.getByTestId("cart-item-prod-1")).toBeInTheDocument();
    expect(screen.getByTestId("cart-item-prod-2")).toBeInTheDocument();
    expect(screen.getByText("Premium Widget")).toBeInTheDocument();
    expect(screen.getByText("Pro Cable")).toBeInTheDocument();

    // Product 1 has quantity 2.
    expect(screen.getByTestId("cart-qty-prod-1").textContent).toBe("2");
    expect(screen.getByTestId("cart-qty-prod-2").textContent).toBe("1");
  });

  it("shows the total count and total price", () => {
    renderPage();
    expect(screen.getByTestId("cart-total")).toBeInTheDocument();
    // Total reflects 3 items / baseTotal 11000.
    expect(
      screen.getByText(/11[\s\u00a0\u202f]?000|11000/),
    ).toBeInTheDocument();
    expect(screen.getByText("3 item(s)")).toBeInTheDocument();
  });

  it("calls updateQuantity when increasing and decreasing", () => {
    renderPage();
    // Two items render two increase/decrease button pairs; target the first.
    const increaseButtons = screen.getAllByLabelText("Increase quantity");
    const decreaseButtons = screen.getAllByLabelText("Decrease quantity");

    fireEvent.click(increaseButtons[0]);
    expect(cart.updateQuantity).toHaveBeenCalledWith("prod-1", 3);

    fireEvent.click(decreaseButtons[0]);
    expect(cart.updateQuantity).toHaveBeenCalledWith("prod-1", 1);
  });

  it("calls removeItem when removing an item", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("remove-prod-1"));
    expect(cart.removeItem).toHaveBeenCalledWith("prod-1");
  });

  it("calls clear when clearing the cart", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("clear-cart"));
    expect(cart.clear).toHaveBeenCalled();
  });
});
