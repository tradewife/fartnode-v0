/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import App from "./App";

vi.mock("./components/BlinkifyDemo", () => ({
  BlinkifyDemo: () => <div data-testid="blinkify-demo">Blink demo</div>
}));

describe("App", () => {
  it("renders the Blinkify headline", () => {
    render(<App />);

    expect(screen.getByText(/Fartnode Blinkify Demo/i)).toBeInTheDocument();
    expect(screen.getByTestId("blinkify-demo")).toBeInTheDocument();
  });
});
