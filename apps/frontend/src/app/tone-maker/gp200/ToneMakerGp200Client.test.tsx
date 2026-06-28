import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import ToneMakerGp200Client from "./ToneMakerGp200Client";
import type { Gp200ToneRequest } from "@/lib/gp200";

const patchResponse = {
  device: "Mooer",
  model: "GE Labs GP-200",
  tone_goal: "tight modern rhythm",
  pickup_type: "humbucker bridge",
  connection_mode: "fx_return" as const,
  signal_chain: ["noise_gate", "drive", "amp", "cab"],
  modules: {
    amp: { enabled: true, model: "US Hi Gain", gain: 46 },
    cab: { enabled: false, model: "4x12 Modern V30" },
  },
  warnings: ["Cab disabled for FX return into a power amp or amp return."],
  valid: true,
};

afterEach(() => {
  cleanup();
});

describe("ToneMakerGp200Client", () => {
  test("renders tone goal, pickup type, and all connection mode fields", () => {
    render(<ToneMakerGp200Client createPatch={vi.fn()} />);

    expect(screen.getByLabelText("Tone goal")).toBeDefined();
    expect(screen.getByLabelText("Pickup type")).toBeDefined();
    expect(screen.getByLabelText("Headphones")).toBeDefined();
    expect(screen.getByLabelText("Direct USB")).toBeDefined();
    expect(screen.getByLabelText("Guitar amp input")).toBeDefined();
    expect(screen.getByLabelText("FX return")).toBeDefined();
    expect(screen.getByLabelText("Four cable method")).toBeDefined();
  });

  test("shows loading state and renders the returned patch card", async () => {
    let resolvePatch: (value: typeof patchResponse) => void = () => {};
    const createPatch = vi.fn(
      () =>
        new Promise<typeof patchResponse>((resolve) => {
          resolvePatch = resolve;
        }),
    );

    render(<ToneMakerGp200Client createPatch={createPatch} />);

    fireEvent.change(screen.getByLabelText("Tone goal"), {
      target: { value: "tight modern rhythm" },
    });
    fireEvent.change(screen.getByLabelText("Pickup type"), {
      target: { value: "humbucker bridge" },
    });
    fireEvent.click(screen.getByLabelText("FX return"));
    fireEvent.click(screen.getByRole("button", { name: "Generate patch" }));

    expect(screen.getByRole("button", { name: "Generating..." })).toBeDefined();
    expect(createPatch).toHaveBeenCalledWith({
      tone_goal: "tight modern rhythm",
      pickup_type: "humbucker bridge",
      connection_mode: "fx_return",
    } satisfies Gp200ToneRequest);

    resolvePatch(patchResponse);

    await waitFor(() => {
      expect(screen.getByText("GE Labs GP-200")).toBeDefined();
    });
    expect(screen.getByText("noise_gate -> drive -> amp -> cab")).toBeDefined();
    expect(screen.getByText("Cab disabled for FX return into a power amp or amp return.")).toBeDefined();
  });

  test("shows an error message when the backend request fails", async () => {
    const createPatch = vi.fn().mockRejectedValue(new Error("Backend offline"));

    render(<ToneMakerGp200Client createPatch={createPatch} />);

    fireEvent.change(screen.getByLabelText("Tone goal"), {
      target: { value: "edge of breakup" },
    });
    fireEvent.change(screen.getByLabelText("Pickup type"), {
      target: { value: "p90 bridge" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate patch" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Backend offline");
    });
  });
});
