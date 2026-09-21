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

  it("renders only the name and whatsapp fields", () => {
    renderModal();

    expect(screen.getByLabelText(/Store Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp Number/)).toBeInTheDocument();

    // Bare-minimum form: no description, logo, or location fields
    expect(
      screen.queryByLabelText(/Store Description/),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Store Logo/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Location/)).not.toBeInTheDocument();
  });

  it("submits only name and whatsapp number", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Store Name/), {
      target: { value: "My Store" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Number/), {
      target: { value: "+237 123 456 789" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Store/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "My Store",
      contact_whatsapp: "+237 123 456 789",
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
