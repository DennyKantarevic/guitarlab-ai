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
    <main className="electric-shell px-6 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <section className="space-y-6">
          <div className="space-y-2">
            <p className="stage-kicker">
              GuitarLab AI
            </p>
            <h1 className="page-title text-4xl sm:text-5xl">
              GP-200 Tone Maker
            </h1>
          </div>

          <form
            className="panel-card space-y-5 p-5"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label className="form-label text-sm" htmlFor="tone_goal">
                Tone goal
              </label>
              <textarea
                className="electric-input min-h-28 px-3 py-3 text-base"
                id="tone_goal"
                name="tone_goal"
                onChange={(event) => setToneGoal(event.target.value)}
                placeholder="tight modern rhythm"
                required
                value={toneGoal}
              />
            </div>

            <div className="space-y-2">
              <label className="form-label text-sm" htmlFor="pickup_type">
                Pickup type
              </label>
              <input
                className="electric-input h-11 px-3 text-base"
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
              <legend className="form-label text-sm">
                Connection mode
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {GP200_CONNECTION_MODES.map((mode) => (
                  <label
                    className="option-card flex min-h-12 cursor-pointer items-center gap-3 rounded px-3 text-sm"
                    key={mode}
                  >
                    <input
                      checked={connectionMode === mode}
                      className="size-4 accent-cyan-300"
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
              className="primary-action h-11 w-full px-4 text-sm"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Generating..." : "Generate patch"}
            </button>
          </form>
        </section>

        <section className="panel-card-strong min-h-[420px] p-5">
          {error ? (
            <div
              className="alert-error p-4 text-sm"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {patch ? <PatchCard patch={patch} /> : null}

          {!patch && !error ? (
            <div className="panel-empty flex h-full min-h-[360px] items-center justify-center p-4 text-center text-sm">
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
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-300/20 pb-4">
        <div>
          <p className="text-sm text-neutral-400">{patch.device}</p>
          <h2 className="text-2xl font-semibold text-white">{patch.model}</h2>
        </div>
        <span className="status-pill rounded px-2 py-1 text-xs font-semibold">
          {patch.valid ? "Valid" : "Invalid"}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="data-label">Tone goal</dt>
          <dd className="font-medium text-neutral-100">{patch.tone_goal}</dd>
        </div>
        <div>
          <dt className="data-label">Pickup type</dt>
          <dd className="font-medium text-neutral-100">{patch.pickup_type}</dd>
        </div>
        <div>
          <dt className="data-label">Connection mode</dt>
          <dd className="font-medium text-neutral-100">
            {CONNECTION_MODE_LABELS[patch.connection_mode]}
          </dd>
        </div>
        <div>
          <dt className="data-label">Style</dt>
          <dd className="font-medium text-neutral-100">{patch.style}</dd>
        </div>
        <div>
          <dt className="data-label">Signal chain</dt>
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
              className="code-panel rounded p-3"
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
        <pre className="code-panel overflow-x-auto rounded p-3 text-xs leading-5">
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
        <div className="alert-warning space-y-2 p-3">
          <h3 className="text-sm font-semibold text-amber-100">Warnings</h3>
          <ul className="space-y-1 text-sm text-amber-50">
            {patch.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="code-panel space-y-2 rounded p-3">
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
