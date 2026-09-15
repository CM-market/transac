import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import { ToastProvider } from "./ToastContainer";
import SellerDashboard from "./SellerDashboard";

// The real apiAuthService module imports a non-generated openapi-rq path.
// Stub it so SellerDashboard can load and report an unauthenticated user.
vi.mock("../services/keyManagement/apiAuthService", () => ({
  apiAuthService: {
    getCurrentToken: () => null,
  },
}));

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("SellerDashboard handleCreateStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDashboard = () =>
    render(
      <ToastProvider>
        <SellerDashboard />
      </ToastProvider>,
    );

  const openCreateStoreModal = async () => {
    renderDashboard();
    // Wait for the initial stores GET to settle (empty list).
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /Create Store/i })[0],
    );
    await screen.findByLabelText(/Store Name/i);
  };

  it("POSTs a body containing only name and contact_whatsapp", async () => {
    // First call = GET /api/v1/stores (empty). Later calls handled below.
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({ stores: [] }),
    );

    await openCreateStoreModal();

    fireEvent.change(screen.getByLabelText(/Store Name/i), {
      target: { value: "TechHub" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Number/i), {
      target: { value: "+237 700 000 000" },
    });

    // Submit via the modal's form (unambiguous — the quick-actions button
    // shares the "Create Store" label with the modal's submit button).
    const modalForm = document.querySelector("form");
    expect(modalForm).not.toBeNull();
    fireEvent.submit(modalForm!);

    // Find the POST request to /api/v1/stores.
    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(([, init]) => {
        const method = (init as RequestInit | undefined)?.method;
        return method === "POST";
      });
      expect(postCalls.length).toBeGreaterThan(0);
    });

    const postCall = fetchMock.mock.calls.find(([, init]) => {
      const method = (init as RequestInit | undefined)?.method;
      return method === "POST";
    })!;

    const [url, init] = postCall as [string, RequestInit];
    expect(url).toBe("/api/v1/stores");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      name: "TechHub",
      contact_whatsapp: "+237 700 000 000",
      owner_device_id: null,
    });
    // Bare-minimum: no extra optional store fields.
    expect(body).not.toHaveProperty("description");
    expect(body).not.toHaveProperty("logo_url");
    expect(body).not.toHaveProperty("location");
  });
});
