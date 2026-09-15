import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StoreCreationModal from "../components/StoreCreationModal";

// react-i18next default returns the key; ensure labels fall back to English strings.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe("StoreCreationModal", () => {
  it("renders only the name and whatsapp fields (bare minimum)", () => {
    render(
      <StoreCreationModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />,
    );

    // Bare-minimum fields present
    expect(
      screen.getByLabelText(/Store Name \*/),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/WhatsApp Number/),
    ).toBeInTheDocument();

    // Removed fields must NOT be present
    expect(
      screen.queryByText(/Store Description/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Store Logo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Location \*/)).not.toBeInTheDocument();
  });

  it("submits only name and whatsapp payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <StoreCreationModal isOpen onClose={onClose} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText(/Store Name \*/), {
      target: { value: "My Shop" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Number/), {
      target: { value: "+237 123 456 789" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Create Store/i }),
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "My Shop",
        contact_whatsapp: "+237 123 456 789",
      });
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("does not render when closed", () => {
    const { container } = render(
      <StoreCreationModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
