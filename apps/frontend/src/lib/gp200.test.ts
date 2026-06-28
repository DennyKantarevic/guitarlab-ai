import { describe, expect, test, vi } from "vitest";

import { createGp200Patch } from "./gp200";

describe("createGp200Patch", () => {
  test("posts tone maker input to the default FastAPI backend URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device: "Valeton",
        model: "GP-200",
        style: "metal",
        tone_goal: "tight rhythm",
        pickup_type: "humbucker",
        connection_mode: "direct_usb",
        signal_chain: [],
        modules: {},
        warnings: [],
        summary: "Metal GP-200 patch for humbucker via direct usb.",
        tone_intent: {
          selected_style: "metal",
          matched_keywords: ["metal"],
          fallback_used: false,
          pickup_adjustments: [],
          connection_rules_applied: [],
          confidence: "medium",
        },
        dial_in_instructions: ["Create a new patch on the Valeton GP-200."],
        valid: true,
        errors: [],
      }),
    });

    const patch = await createGp200Patch(
      {
        tone_goal: "tight rhythm",
        pickup_type: "humbucker",
        connection_mode: "direct_usb",
      },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/tone-maker/gp200",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone_goal: "tight rhythm",
          pickup_type: "humbucker",
          connection_mode: "direct_usb",
        }),
      },
    );
    expect(patch.valid).toBe(true);
    expect(patch.dial_in_instructions).toEqual([
      "Create a new patch on the Valeton GP-200.",
    ]);
  });

  test("uses NEXT_PUBLIC_BACKEND_URL when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device: "Valeton",
        model: "GP-200",
        style: "clean_indie",
        tone_goal: "clean delay",
        pickup_type: "single coil",
        connection_mode: "headphones",
        signal_chain: [],
        modules: {},
        warnings: [],
        summary: "Clean Indie GP-200 patch for single coil via headphones.",
        tone_intent: {
          selected_style: "clean_indie",
          matched_keywords: ["clean"],
          fallback_used: false,
          pickup_adjustments: [],
          connection_rules_applied: [],
          confidence: "medium",
        },
        dial_in_instructions: ["Create a new patch on the Valeton GP-200."],
        valid: true,
        errors: [],
      }),
    });

    await createGp200Patch(
      {
        tone_goal: "clean delay",
        pickup_type: "single coil",
        connection_mode: "headphones",
      },
      fetchMock,
      "http://localhost:9000/",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:9000/tone-maker/gp200",
      expect.any(Object),
    );
  });

  test("falls back to localhost when the backend URL is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device: "Valeton",
        model: "GP-200",
        style: "clean_indie",
        tone_goal: "clean delay",
        pickup_type: "single coil",
        connection_mode: "headphones",
        signal_chain: [],
        modules: {},
        warnings: [],
        summary: "Clean Indie GP-200 patch for single coil via headphones.",
        tone_intent: {
          selected_style: "clean_indie",
          matched_keywords: ["clean"],
          fallback_used: false,
          pickup_adjustments: [],
          connection_rules_applied: [],
          confidence: "medium",
        },
        dial_in_instructions: ["Create a new patch on the Valeton GP-200."],
        valid: true,
        errors: [],
      }),
    });

    await createGp200Patch(
      {
        tone_goal: "clean delay",
        pickup_type: "single coil",
        connection_mode: "headphones",
      },
      fetchMock,
      "",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/tone-maker/gp200",
      expect.any(Object),
    );
  });

  test("throws a useful error when the backend rejects the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "invalid connection mode",
    });

    await expect(
      createGp200Patch(
        {
          tone_goal: "edge of breakup",
          pickup_type: "p90",
          connection_mode: "four_cable_method",
        },
        fetchMock,
      ),
    ).rejects.toThrow("Tone maker request failed: 422 invalid connection mode");
  });
});
