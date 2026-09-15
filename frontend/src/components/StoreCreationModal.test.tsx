import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import StoreCreationModal, { StoreFormData } from "./StoreCreationModal";

describe("StoreCreationModal", () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  const fillNameAndWhatsapp = () => {
    fireEvent.change(screen.getByLabelText(/Store Name/i), {
      target: { value: "My Store" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Number/i), {
      target: { value: "+237 123 456 789" },
    });
  };

  beforeEach(() => {
    onClose.mockClear();
    onSubmit.mockClear();
  });

  it("renders the store name and whatsapp fields", () => {
    render(
      <StoreCreationModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Create Store/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Store Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp Number/i)).toBeInTheDocument();
  });

  it("does not render description, logo, or location fields", () => {
    render(
      <StoreCreationModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByLabelText(/Store Description/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Store Logo/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Logo URL/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Location/i)).not.toBeInTheDocument();
  });

  it("calls onSubmit with exactly { name, contact_whatsapp } on submit", async () => {
    render(
      <StoreCreationModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fillNameAndWhatsapp();
    fireEvent.click(screen.getByRole("button", { name: /Create Store/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const arg = onSubmit.mock.calls[0][0] as StoreFormData;
    expect(arg).toEqual({
      name: "My Store",
      contact_whatsapp: "+237 123 456 789",
    });
    expect(Object.keys(arg).sort()).toEqual([
      "contact_whatsapp",
      "name",
    ]);
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <StoreCreationModal
        isOpen={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
