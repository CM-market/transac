import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock window.crypto for tests
Object.defineProperty(window, "crypto", {
  value: {
    subtle: {
      generateKey: vi.fn(),
      exportKey: vi.fn(),
      importKey: vi.fn(),
    },
    getRandomValues: vi.fn(),
  },
});

// Mock IndexedDB
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, "indexedDB", {
  value: indexedDB,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Store: () => "Store Icon",
  Truck: () => "Truck Icon",
  Globe2: () => "Globe2 Icon",
  Shield: () => "Shield Icon",
  Users: () => "Users Icon",
  Package: () => "Package Icon",
  ShoppingCart: () => "ShoppingCart Icon",
  CheckCircle: () => "CheckCircle Icon",
  Heart: () => "Heart Icon",
  Star: () => "Star Icon",
  ArrowLeft: () => "ArrowLeft Icon",
  ChevronRight: () => "ChevronRight Icon",
  Building2: () => "Building2 Icon",
  ChevronLeft: () => "ChevronLeft Icon",
  TrendingUp: () => "TrendingUp Icon",
  Check: () => "Check Icon",
  Minus: () => "Minus Icon",
  Plus: () => "Plus Icon",
  Share2: () => "Share2 Icon",
  ShieldCheck: () => "ShieldCheck Icon",
  ChevronDown: () => "ChevronDown Icon",
}));
