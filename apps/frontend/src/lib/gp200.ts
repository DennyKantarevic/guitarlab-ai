export const GP200_CONNECTION_MODES = [
  "headphones",
  "direct_usb",
  "guitar_amp_input",
  "fx_return",
  "four_cable_method",
] as const;

export type Gp200ConnectionMode = (typeof GP200_CONNECTION_MODES)[number];

export type Gp200ToneRequest = {
  tone_goal: string;
  pickup_type: string;
  connection_mode: Gp200ConnectionMode;
};

export type Gp200ToneIntent = {
  selected_style: string;
  matched_keywords: string[];
  fallback_used: boolean;
  pickup_adjustments: string[];
  connection_rules_applied: string[];
  confidence: "low" | "medium" | "high";
};

export type Gp200PatchResponse = {
  device: string;
  model: string;
  style: string;
  tone_goal: string;
  pickup_type: string;
  connection_mode: Gp200ConnectionMode;
  signal_chain: string[];
  modules: Record<string, Record<string, unknown>>;
  warnings: string[];
  summary: string;
  tone_intent: Gp200ToneIntent;
  dial_in_instructions: string[];
  valid: boolean;
  errors: string[];
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json" | "text">>;

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export async function createGp200Patch(
  request: Gp200ToneRequest,
  fetcher: FetchLike = fetch,
  backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL,
): Promise<Gp200PatchResponse> {
  const response = await fetcher(
    `${normalizeBackendUrl(backendUrl || DEFAULT_BACKEND_URL)}/tone-maker/gp200`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Tone maker request failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<Gp200PatchResponse>;
}

function normalizeBackendUrl(backendUrl: string): string {
  return backendUrl.replace(/\/+$/, "");
}
