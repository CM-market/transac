import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceWelcome from "./MarketplaceWelcome";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { vi } from "vitest";

describe("MarketplaceWelcome", () => {
  const onBuy = vi.fn();
  const onSell = vi.fn();
  const onBack = vi.fn();

  it("renders the welcome message and buttons", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MarketplaceWelcome onBuy={onBuy} onSell={onSell} />
      </I18nextProvider>,
    );

    expect(screen.getByText("Welcome to Transac")).toBeInTheDocument();
    expect(
      screen.getByText("B2B Marketplace for Cameroon"),
    ).toBeInTheDocument();
    expect(screen.getByText("Buy Products")).toBeInTheDocument();
    expect(screen.getByText("Sell Products")).toBeInTheDocument();
  });

  it("calls the onBuy prop when the buy button is clicked", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MarketplaceWelcome onBuy={onBuy} onSell={onSell} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByText("Buy Products"));
    expect(onBuy).toHaveBeenCalled();
  });

  it("calls the onSell prop when the sell button is clicked", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MarketplaceWelcome onBuy={onBuy} onSell={onSell} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByText("Sell Products"));
    expect(onSell).toHaveBeenCalled();
  });

  it("renders the back button when onBack is provided", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MarketplaceWelcome onBuy={onBuy} onSell={onSell} onBack={onBack} />
      </I18nextProvider>,
    );

    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("calls the onBack prop when the back button is clicked", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MarketplaceWelcome onBuy={onBuy} onSell={onSell} onBack={onBack} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
