import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Profile from "../pages/Profile";
import { getProfile, updateProfile } from "../services/profile";

vi.mock("../services/profile", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays the existing profile", async () => {
    (getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      device_id: "device-1",
      name: "Alice",
      phone: "+237612345678",
      location: "Douala",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });

    renderProfile();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("+237612345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Douala")).toBeInTheDocument();
  });

  it("shows an error when the name is empty", async () => {
    (getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    renderProfile();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Save Profile/i }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("shows an error for an invalid Cameroon phone", async () => {
    (getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    renderProfile();

    const nameInput = await screen.findByLabelText(/Name/i);

    fireEvent.change(screen.getByLabelText(/Phone/i), {
      target: { value: "+33612345678" },
    });
    fireEvent.change(nameInput, {
      target: { value: "Bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(
      await screen.findByText(/valid Cameroon number/i),
    ).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("saves the profile and reflects the saved values immediately", async () => {
    (getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      device_id: "device-1",
      name: "Bob",
      phone: "+237650987654",
      location: "Yaoundé",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    renderProfile();

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/Phone/i), {
      target: { value: "+237650987654" },
    });
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: "Yaoundé" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith({
      name: "Bob",
      phone: "+237650987654",
      location: "Yaoundé",
    });
    // Values reflect immediately after save.
    expect(screen.getByDisplayValue("Bob")).toBeInTheDocument();
  });
});
