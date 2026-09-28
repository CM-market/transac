import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CartProvider, useCart, CartItem } from "./CartContext";

/**
 * The global test setup (test-setup.ts) stubs window.localStorage with bare
 * spies that never actually store values.
 *
 * For the cart (which persists to localStorage) we install a real in-memory
 * implementation so the persistence behavior can be exercised deterministically.
 */
function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  };
  Object.defineProperty(window, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
  return store;
}

/**
 * Test harness that renders the cart state into the DOM so we can assert on it,
 * and exposes an "Add", "Remove", "Update qty", and "Clear" button to drive the
 * context actions the way a real page would.
 */
function Harness() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    totalCount,
    totalPrice,
  } = useCart();

  const sample: Omit<CartItem, "quantity"> = {
    productId: "prod-1",
    storeId: "store-1",
    name: "Test Product",
    price: 150,
  };

  return (
    <div>
      <ul data-testid="items">
        {items.map((item) => (
          <li key={item.productId} data-testid={`item-${item.productId}`}>
            {item.name} x{item.quantity}
          </li>
        ))}
      </ul>
      <span data-testid="count">{totalCount}</span>
      <span data-testid="total">{totalPrice}</span>
      <button onClick={() => addItem(sample)}>Add</button>
      <button onClick={() => addItem(sample, 3)}>Add 3</button>
      <button onClick={() => removeItem("prod-1")}>Remove</button>
      <button onClick={() => updateQuantity("prod-1", 5)}>Set qty 5</button>
      <button onClick={clear}>Clear</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <CartProvider>
      <Harness />
    </CartProvider>,
  );
}

describe("CartContext", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it("starts with an empty cart", () => {
    renderHarness();
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("total").textContent).toBe("0");
    expect(screen.queryAllByTestId(/^item-/)).toHaveLength(0);
  });

  it("adds an item to the cart", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add"));
    const item = screen.getByTestId("item-prod-1");
    expect(item.textContent).toContain("Test Product");
    expect(item.textContent).toContain("x1");
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("150");
  });

  it("merges quantities when adding the same product again", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add"));
    expect(screen.getByTestId("item-prod-1").textContent).toContain("x2");
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("total").textContent).toBe("300");
  });

  it("supports adding with an explicit quantity", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add 3"));
    expect(screen.getByTestId("item-prod-1").textContent).toContain("x3");
    expect(screen.getByTestId("total").textContent).toBe("450");
  });

  it("removes an item from the cart", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Remove"));
    expect(screen.queryByTestId("item-prod-1")).toBeNull();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("updates the quantity of an item", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Set qty 5"));
    expect(screen.getByTestId("item-prod-1").textContent).toContain("x5");
    expect(screen.getByTestId("total").textContent).toBe("750");
  });

  it("clears all items", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add 3"));
    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryAllByTestId(/^item-/)).toHaveLength(0);
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("persists the cart to localStorage on change", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Add"));
    const value = window.localStorage.getItem("transac.cart.v1");
    expect(value).toBeTruthy();
    const parsed = JSON.parse(value!) as CartItem[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].productId).toBe("prod-1");
  });

  it("restores persisted items on mount", () => {
    window.localStorage.setItem(
      "transac.cart.v1",
      JSON.stringify([
        {
          productId: "saved-1",
          storeId: "store-1",
          name: "Saved Product",
          price: 100,
          quantity: 2,
        },
      ] as CartItem[]),
    );
    renderHarness();
    const item = screen.getByTestId("item-saved-1");
    expect(item.textContent).toContain("Saved Product");
    expect(item.textContent).toContain("x2");
    expect(screen.getByTestId("count").textContent).toBe("2");
  });

  it("recovers gracefully when persisted data is corrupt", () => {
    window.localStorage.setItem("transac.cart.v1", "{not valid json");
    renderHarness();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
});
