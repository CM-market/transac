import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import About from "../About";
import { describe, it, expect } from "vitest";

describe("About page", () => {
  it("renders the main title and subtitle", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <About />
      </I18nextProvider>,
    );

    expect(screen.getByText("Transac")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your Gateway to Cameroonian Commerce and Global Products",
      ),
    ).toBeInTheDocument();
  });
});
