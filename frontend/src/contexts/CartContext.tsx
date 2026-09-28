import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * A cart line represents one product added to the buyer's cart.
 */
export interface CartItem {
  /** Product id (UUID). */
  productId: string;
  /** Store id the product belongs to (for seller info / checkout). */
  storeId: string;
  /** Product display name. */
  name: string;
  /** Unit price for the product. */
  price: number;
  /** Number of units in the cart. */
  quantity: number;
}

export interface CartContextType {
  /** Current items in the cart (empty when no items). */
  items: CartItem[];
  /** Add a product to the cart (merges quantity if it already exists). */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  /** Remove a product entirely from the cart. */
  removeItem: (productId: string) => void;
  /** Update the quantity of an existing cart item. */
  updateQuantity: (productId: string, quantity: number) => void;
  /** Remove all items from the cart. */
  clear: () => void;
  /** Total number of units across all items. */
  totalCount: number;
  /** Total monetary value of all items. */
  totalPrice: number;
}

const CART_STORAGE_KEY = "transac.cart.v1";

export const CartContext = createContext<CartContextType | null>(null);

/** Read the persisted cart from localStorage (best-effort). */
function loadPersistedCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt/missing storage is not fatal — start with an empty cart.
    return [];
  }
}

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

interface CartProviderProps {
  children: React.ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadPersistedCart);

  // Persist to localStorage on every change so the cart survives refreshes
  // and sessions (see store.md: "Cart persists across session").
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full/unavailable — cart still works in-memory.
    }
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const qty = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + qty }
              : i,
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const qty = Math.max(1, Math.floor(quantity));
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      ),
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextType>(() => {
    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      totalCount,
      totalPrice,
    };
  }, [items, addItem, removeItem, updateQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartProvider;
