import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import StoreCreationModal from "./StoreCreationModal";

describe("StoreCreationModal", () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  const renderModal = (isOpen = true) =>
    render(
      <StoreCreationModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when closed", () => {
    renderModal(false);
    expect(
      screen.queryByRole("heading", { name: "Create Store" }),
    ).not.toBeInTheDocument();
  });

  it("renders the store name and whatsapp number fields only", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Create Store" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Store Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp Number/)).toBeInTheDocument();
  });

  it("does not render the removed fields (description, logo, location)", () => {
    renderModal();

    expect(screen.queryByText(/Store Description/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Store Logo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Location/i)).not.toBeInTheDocument();
  });

  it("submits only name and contact_whatsapp", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Store Name/), {
      target: { value: "Accra Foods" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Number/), {
      target: { value: "+233 123 456 789" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Store" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Accra Foods",
        contact_whatsapp: "+233 123 456 789",
      });
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("calls onClose when the cancel button is clicked", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
