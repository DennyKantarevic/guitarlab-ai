import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import ToneMakerGp200Client from "./ToneMakerGp200Client";
import type { Gp200PatchResponse, Gp200ToneRequest } from "@/lib/gp200";

const patchResponse: Gp200PatchResponse = {
  device: "Valeton",
  model: "GP-200",
  style: "classic_rock",
  tone_goal: "tight modern rhythm",
  pickup_type: "humbucker bridge",
  connection_mode: "fx_return" as const,
  signal_chain: ["noise_gate", "drive", "amp", "cab"],
  modules: {
    amp: { enabled: true, model: "US Hi Gain", gain: 46 },
    cab: { enabled: false, model: "4x12 Modern V30" },
  },
  warnings: ["Cab disabled for FX return into a power amp or amp return."],
  summary: "Classic Rock GP-200 patch for humbucker bridge via fx return.",
  tone_intent: {
    selected_style: "classic_rock",
    matched_keywords: ["classic rock"],
    fallback_used: false,
    pickup_adjustments: [],
    connection_rules_applied: [
      "FX return mode keeps AMP enabled and disables CAB for use into a power amp/speaker section.",
    ],
    confidence: "medium",
  },
  dial_in_instructions: ["Create a new patch on the Valeton GP-200."],
  valid: true,
  errors: [],
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
      expect(screen.getByText("GP-200")).toBeDefined();
    });
    expect(screen.getByText("noise_gate -> drive -> amp -> cab")).toBeDefined();
    expect(screen.getByText("Cab disabled for FX return into a power amp or amp return.")).toBeDefined();
  });

  test("submitting the form prevents query-string navigation and calls the API client", async () => {
    const createPatch = vi.fn().mockResolvedValue(patchResponse);
    const { container } = render(<ToneMakerGp200Client createPatch={createPatch} />);

    fireEvent.change(screen.getByLabelText("Tone goal"), {
      target: { value: "tight modern rhythm" },
    });
    fireEvent.change(screen.getByLabelText("Pickup type"), {
      target: { value: "humbucker bridge" },
    });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("method")).toBeNull();
    expect(form?.getAttribute("action")).toBeNull();
    const initialHref = window.location.href;
    const submitWasNotCanceled = fireEvent.submit(form as HTMLFormElement);

    expect(submitWasNotCanceled).toBe(false);
    await waitFor(() => {
      expect(createPatch).toHaveBeenCalledWith({
        tone_goal: "tight modern rhythm",
        pickup_type: "humbucker bridge",
        connection_mode: "headphones",
      } satisfies Gp200ToneRequest);
    });
    expect(window.location.href).toBe(initialHref);
    expect(window.location.search).not.toContain("tone_goal=");
  });

  test("renders successful response fields including tone intent, dial-in instructions, and errors", async () => {
    const createPatch = vi.fn().mockResolvedValue({
      ...patchResponse,
      valid: false,
      errors: ["AMP and CAB state does not match connection mode."],
    } satisfies Gp200PatchResponse);

    render(<ToneMakerGp200Client createPatch={createPatch} />);

    fireEvent.change(screen.getByLabelText("Tone goal"), {
      target: { value: "tight modern rhythm" },
    });
    fireEvent.change(screen.getByLabelText("Pickup type"), {
      target: { value: "humbucker bridge" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate patch" }));

    await waitFor(() => {
      expect(screen.getByText("GP-200")).toBeDefined();
    });

    expect(screen.getByText("Valeton")).toBeDefined();
    expect(screen.getByText("classic_rock")).toBeDefined();
    expect(screen.getByText(/classic rock/)).toBeDefined();
    expect(screen.getByText(/medium/)).toBeDefined();
    expect(
      screen.getByText("Create a new patch on the Valeton GP-200."),
    ).toBeDefined();
    expect(
      screen.getByText("AMP and CAB state does not match connection mode."),
    ).toBeDefined();
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
