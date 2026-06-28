"use client";

import { FormEvent, useState } from "react";

import {
  createGp200Patch,
  GP200_CONNECTION_MODES,
  type Gp200ConnectionMode,
  type Gp200PatchResponse,
  type Gp200ToneRequest,
} from "@/lib/gp200";

type ToneMakerGp200ClientProps = {
  createPatch?: (request: Gp200ToneRequest) => Promise<Gp200PatchResponse>;
};

const CONNECTION_MODE_LABELS: Record<Gp200ConnectionMode, string> = {
  headphones: "Headphones",
  direct_usb: "Direct USB",
  guitar_amp_input: "Guitar amp input",
  fx_return: "FX return",
  four_cable_method: "Four cable method",
};

export default function ToneMakerGp200Client({
  createPatch = createGp200Patch,
}: ToneMakerGp200ClientProps) {
  const [toneGoal, setToneGoal] = useState("");
  const [pickupType, setPickupType] = useState("");
  const [connectionMode, setConnectionMode] =
    useState<Gp200ConnectionMode>("headphones");
  const [patch, setPatch] = useState<Gp200PatchResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setPatch(null);

    try {
      const nextPatch = await createPatch({
        tone_goal: toneGoal,
        pickup_type: pickupType,
        connection_mode: connectionMode,
      });
      setPatch(nextPatch);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate a GP-200 patch.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
              GuitarLab AI
            </p>
            <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              GP-200 Tone Maker
            </h1>
          </div>

          <form
            className="space-y-5 rounded border border-neutral-800 bg-neutral-900 p-5 shadow-xl shadow-black/20"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="tone_goal">
                Tone goal
              </label>
              <textarea
                className="min-h-28 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-3 text-base text-white outline-none ring-emerald-400/40 transition focus:border-emerald-300 focus:ring-4"
                id="tone_goal"
                name="tone_goal"
                onChange={(event) => setToneGoal(event.target.value)}
                placeholder="tight modern rhythm"
                required
                value={toneGoal}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200" htmlFor="pickup_type">
                Pickup type
              </label>
              <input
                className="h-11 w-full rounded border border-neutral-700 bg-neutral-950 px-3 text-base text-white outline-none ring-emerald-400/40 transition focus:border-emerald-300 focus:ring-4"
                id="pickup_type"
                name="pickup_type"
                onChange={(event) => setPickupType(event.target.value)}
                placeholder="humbucker bridge"
                required
                type="text"
                value={pickupType}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-neutral-200">
                Connection mode
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {GP200_CONNECTION_MODES.map((mode) => (
                  <label
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-200 transition hover:border-neutral-500 has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/10"
                    key={mode}
                  >
                    <input
                      checked={connectionMode === mode}
                      className="size-4 accent-emerald-300"
                      name="connection_mode"
                      onChange={() => setConnectionMode(mode)}
                      type="radio"
                      value={mode}
                    />
                    {CONNECTION_MODE_LABELS[mode]}
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              className="h-11 w-full rounded bg-emerald-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Generating..." : "Generate patch"}
            </button>
          </form>
        </section>

        <section className="min-h-[420px] rounded border border-neutral-800 bg-neutral-900 p-5">
          {error ? (
            <div
              className="rounded border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {patch ? <PatchCard patch={patch} /> : null}

          {!patch && !error ? (
            <div className="flex h-full min-h-[360px] items-center justify-center text-center text-neutral-400">
              <p>Submit a tone request to generate the first GP-200 patch.</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function PatchCard({ patch }: { patch: Gp200PatchResponse }) {
  return (
    <article className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <p className="text-sm text-neutral-400">{patch.device}</p>
          <h2 className="text-2xl font-semibold text-white">{patch.model}</h2>
        </div>
        <span className="rounded bg-emerald-300 px-2 py-1 text-xs font-semibold text-neutral-950">
          {patch.valid ? "Valid" : "Invalid"}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500">Tone goal</dt>
          <dd className="font-medium text-neutral-100">{patch.tone_goal}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Pickup type</dt>
          <dd className="font-medium text-neutral-100">{patch.pickup_type}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Connection mode</dt>
          <dd className="font-medium text-neutral-100">
            {CONNECTION_MODE_LABELS[patch.connection_mode]}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Style</dt>
          <dd className="font-medium text-neutral-100">{patch.style}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Signal chain</dt>
          <dd className="font-medium text-neutral-100">
            {patch.signal_chain.join(" -> ")}
          </dd>
        </div>
      </dl>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-200">Modules</h3>
        <div className="grid gap-2">
          {Object.entries(patch.modules).map(([name, settings]) => (
            <div
              className="rounded border border-neutral-800 bg-neutral-950 p-3"
              key={name}
            >
              <p className="text-sm font-semibold capitalize text-neutral-100">
                {name.replaceAll("_", " ")}
              </p>
              <pre className="mt-2 overflow-x-auto text-xs leading-5 text-neutral-400">
                {JSON.stringify(settings, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-200">Tone intent</h3>
        <pre className="overflow-x-auto rounded border border-neutral-800 bg-neutral-950 p-3 text-xs leading-5 text-neutral-400">
          {JSON.stringify(patch.tone_intent, null, 2)}
        </pre>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-200">
          Dial-in instructions
        </h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-300">
          {patch.dial_in_instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
      </div>

      {patch.warnings.length > 0 ? (
        <div className="space-y-2 rounded border border-amber-300/40 bg-amber-950/30 p-3">
          <h3 className="text-sm font-semibold text-amber-100">Warnings</h3>
          <ul className="space-y-1 text-sm text-amber-50">
            {patch.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 rounded border border-neutral-800 bg-neutral-950 p-3">
        <h3 className="text-sm font-semibold text-neutral-200">Errors</h3>
        {patch.errors.length > 0 ? (
          <ul className="space-y-1 text-sm text-neutral-300">
            {patch.errors.map((patchError) => (
              <li key={patchError}>{patchError}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">No errors.</p>
        )}
      </div>
    </article>
  );
}
