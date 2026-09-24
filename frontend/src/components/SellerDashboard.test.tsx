import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import SellerDashboard from "./SellerDashboard";
import { ToastProvider } from "./ToastContainer";

// Stub global fetch so the dashboard loads deterministically with one store and
// no real network calls during the test.
const stubFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
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
    } as Response),
  );
};

// Render the seller dashboard inside its required Toast context. Returns a
// promise that resolves once the initial store fetch has settled, so assertions
// run inside an act() scope and avoid "not wrapped in act" warnings.
const renderDashboard = async () => {
  const result = render(
    <ToastProvider>
      <SellerDashboard />
    </ToastProvider>,
  );
  // The dashboard calls fetchStores() on mount and updates state asynchronously.
  await screen.findByText("Total Stores");
  return result;
};

describe("SellerDashboard — UI/UX refinement (T-034)", () => {
  beforeEach(() => {
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the core navigation tabs (Overview / My Stores / Products)", async () => {
    await renderDashboard();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("My Stores")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("removes the redundant Images tab", async () => {
    await renderDashboard();
    expect(screen.queryByText("Images")).not.toBeInTheDocument();
  });

  it("keeps only real, data-backed stats on Overview", async () => {
    await renderDashboard();
    expect(screen.getByText("Total Stores")).toBeInTheDocument();
    expect(screen.getByText("Total Products")).toBeInTheDocument();
  });

  it("removes the fabricated/fake stat boxes from Overview", async () => {
    await renderDashboard();
    expect(screen.queryByText("Total Views")).not.toBeInTheDocument();
    expect(screen.queryByText("Avg Rating")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Images")).not.toBeInTheDocument();
    // The hard-coded fake view count (1,234) must not render.
    expect(screen.queryByText(/1,234/)).not.toBeInTheDocument();
  });

  it("removes the redundant Quick Actions box", async () => {
    await renderDashboard();
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
  });
});
