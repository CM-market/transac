import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import SellerDashboard from "./SellerDashboard";
import { ToastProvider } from "./ToastContainer";

// The dashboard mounts and calls fetch on initialization (stores + products).
// Mock fetch globally so tests are deterministic and don't hit the network.
const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ stores: [], products: [] }),
  });
  global.fetch = mockFetch as unknown as typeof fetch;
});

// The dashboard uses useToast(), so it must be rendered inside a ToastProvider.
const renderDashboard = () =>
  render(
    <ToastProvider>
      <SellerDashboard />
    </ToastProvider>,
  );

describe("SellerDashboard (T-034 UI/UX declutter)", () => {
  it("renders only the core tabs and omits the redundant Images tab", async () => {
    renderDashboard();

    // Core navigation tabs remain.
    expect(
      screen.getByRole("button", { name: /Overview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /My Stores/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Products/i }),
    ).toBeInTheDocument();

    // The redundant standalone Images gallery tab is gone.
    expect(
      screen.queryByRole("button", { name: /Images/i }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it("shows only real, data-backed stat boxes in the Overview and no Quick Actions box", async () => {
    renderDashboard();

    // Real metrics are present.
    expect(await screen.findByText(/Total Stores/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Products/i)).toBeInTheDocument();

    // Fabricated / hard-coded stats are gone.
    expect(screen.queryByText(/Avg Rating/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Views/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Images/i)).not.toBeInTheDocument();

    // The redundant single-box Quick Actions grid is gone.
    expect(screen.queryByText(/Quick Actions/i)).not.toBeInTheDocument();
  });

  it("switching tabs keeps the dashboard functional after decluttering", async () => {
    renderDashboard();

    // Navigate to the Products tab; it must still render without the removed view.
    fireEvent.click(screen.getByRole("button", { name: /Products/i }));
    expect(await screen.findByText(/Product List/i)).toBeInTheDocument();
  });
});
