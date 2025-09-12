import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceWelcome from "./MarketplaceWelcome";
import { vi } from "vitest";

describe("MarketplaceWelcome", () => {
  const onBuy = vi.fn();
  const onSell = vi.fn();
  const onBack = vi.fn();

  it("renders the welcome message and buttons", () => {
    render(<MarketplaceWelcome onBuy={onBuy} onSell={onSell} />);

    expect(screen.getByText("Welcome to Transac")).toBeInTheDocument();
    expect(
      screen.getByText("B2B Marketplace for Cameroon"),
    ).toBeInTheDocument();
    expect(screen.getByText("Buy Products")).toBeInTheDocument();
    expect(screen.getByText("Sell Products")).toBeInTheDocument();
  });

  it("calls the onBuy prop when the buy button is clicked", () => {
    render(<MarketplaceWelcome onBuy={onBuy} onSell={onSell} />);

    fireEvent.click(screen.getByText("Buy Products"));
    expect(onBuy).toHaveBeenCalled();
  });

  it("calls the onSell prop when the sell button is clicked", () => {
    render(<MarketplaceWelcome onBuy={onBuy} onSell={onSell} />);

    fireEvent.click(screen.getByText("Sell Products"));
    expect(onSell).toHaveBeenCalled();
  });

  it("renders the back button when onBack is provided", () => {
    render(
      <MarketplaceWelcome onBuy={onBuy} onSell={onSell} onBack={onBack} />,
    );

    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("calls the onBack prop when the back button is clicked", () => {
    render(
      <MarketplaceWelcome onBuy={onBuy} onSell={onSell} onBack={onBack} />,
    );

    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
