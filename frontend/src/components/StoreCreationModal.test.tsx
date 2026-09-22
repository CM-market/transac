import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import StoreCreationModal from "./StoreCreationModal";

describe("StoreCreationModal", () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  const renderModal = (props = {}) =>
    render(
      <StoreCreationModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        {...props}
      />,
    );

  beforeEach(() => {
    onClose.mockClear();
    onSubmit.mockClear();
  });

  it("renders all store creation fields", () => {
    renderModal();

    expect(screen.getByLabelText(/Store Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Logo URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp Number/)).toBeInTheDocument();
  });

  it("submits all store fields", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Store Name/), {
      target: { value: "TechHub Cameroon" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Electronics and gadgets" },
    });
    fireEvent.change(screen.getByLabelText(/Logo URL/), {
      target: { value: "https://example.com/logo.png" },
    });
    fireEvent.change(screen.getByLabelText(/Location/), {
      target: { value: "Douala, Cameroon" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/), {
      target: { value: "+237 123 456 789" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Number/), {
      target: { value: "+237 987 654 321" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Store/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "TechHub Cameroon",
      description: "Electronics and gadgets",
      logo_url: "https://example.com/logo.png",
      location: "Douala, Cameroon",
      contact_phone: "+237 123 456 789",
      contact_whatsapp: "+237 987 654 321",
    });
  });

  it("does not submit when required fields are empty", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Create Store/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("returns null when closed", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("applies mobile-responsive, bottom-sheet classes to the dialog", () => {
    const { container } = renderModal();

    // Backdrop aligns the modal to the bottom on phones and centers on sm:+
    expect(container.firstChild).toHaveClass("items-end");
    expect(container.firstChild).toHaveClass("sm:items-center");

    // Dialog panel uses dynamic viewport height, scrolls when long, and has
    // mobile rounded top corners
    const panel = container.querySelector(".bg-white");
    expect(panel).not.toBeNull();
    expect(panel).toHaveClass("max-h-[90dvh]");
    expect(panel).toHaveClass("overflow-y-auto");
    expect(panel).toHaveClass("rounded-t-2xl");
    expect(panel).toHaveClass("sm:rounded-xl");
  });
});
