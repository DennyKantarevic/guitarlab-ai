import { describe, expect, test, vi } from "vitest";

import { createGp200Patch } from "./gp200";

describe("createGp200Patch", () => {
  test("posts tone maker input to the default FastAPI backend URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device: "Valeton",
        model: "GP-200",
        tone_goal: "tight rhythm",
        pickup_type: "humbucker",
        connection_mode: "direct_usb",
        signal_chain: [],
        modules: {},
        warnings: [],
        valid: true,
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
  });

  test("uses NEXT_PUBLIC_BACKEND_URL when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device: "Valeton",
        model: "GP-200",
        tone_goal: "clean delay",
        pickup_type: "single coil",
        connection_mode: "headphones",
        signal_chain: [],
        modules: {},
        warnings: [],
        valid: true,
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
