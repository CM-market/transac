import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import SellerDashboard from "./SellerDashboard";
import { ToastProvider } from "./ToastContainer";

// Helper to render the seller dashboard inside its required Toast context.
const renderDashboard = () => {
  return render(
    <ToastProvider>
      <SellerDashboard />
    </ToastProvider>,
  );
};

describe("SellerDashboard — UI/UX refinement (T-034)", () => {
  beforeEach(() => {
    // Stub the stores fetch so the dashboard loads deterministically with one store.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        stores: [
          {
            id: "1",
            name: "TechHub Cameroon",
            description: "Electronics and gadgets",
            location: "Douala, Cameroon",
            contact_whatsapp: "+237123456789",
            is_verified: true,
            rating: 4.8,
            total_products: 156,
            created_at: "2024-01-15",
          },
        ],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes the redundant Images tab from the navigation", () => {
    renderDashboard();
    // Core tabs are retained.
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("My Stores")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    // The Images tab must no longer be present.
    expect(screen.queryByText("Images")).not.toBeInTheDocument();
  });

  it("removes the hardcoded Total Views / Avg Rating stat boxes from Overview", () => {
    renderDashboard();
    // Real stats remain.
    expect(screen.getByText("Total Stores")).toBeInTheDocument();
    expect(screen.getByText("Total Products")).toBeInTheDocument();
    // Fabricated stat labels are gone.
    expect(screen.queryByText("Total Views")).not.toBeInTheDocument();
    expect(screen.queryByText("Avg Rating")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Images")).not.toBeInTheDocument();
    // The hardcoded fake view count (1,234) must not be rendered.
    expect(screen.queryByText(/1,234/)).not.toBeInTheDocument();
  });
});
