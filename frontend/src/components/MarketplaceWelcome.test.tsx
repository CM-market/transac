import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceWelcome from "./MarketplaceWelcome";
import { vi } from "vitest";

describe("MarketplaceWelcome", () => {
  const onBuy = vi.fn();
  const onBack = vi.fn();

  it("renders the welcome message and buttons", () => {
    render(<MarketplaceWelcome onBuy={onBuy} />);

    expect(screen.getByText("marketplaceWelcome.title")).toBeInTheDocument();
    expect(screen.getByText("marketplaceWelcome.subtitle")).toBeInTheDocument();
    expect(
      screen.getByText("marketplaceWelcome.buyProducts"),
    ).toBeInTheDocument();
    expect(screen.queryByText("marketplaceWelcome.sellProducts")).toBeNull();
  });

  it("calls the onBuy prop when the buy button is clicked", () => {
    render(<MarketplaceWelcome onBuy={onBuy} />);

    fireEvent.click(screen.getByText("marketplaceWelcome.buyProducts"));
    expect(onBuy).toHaveBeenCalled();
  });

  it("renders the back button when onBack is provided", () => {
    render(<MarketplaceWelcome onBuy={onBuy} onBack={onBack} />);

    expect(screen.getByText("marketplaceWelcome.back")).toBeInTheDocument();
  });

  it("calls the onBack prop when the back button is clicked", () => {
    render(<MarketplaceWelcome onBuy={onBuy} onBack={onBack} />);

    fireEvent.click(screen.getByText("marketplaceWelcome.back"));
    expect(onBack).toHaveBeenCalled();
  });
});
