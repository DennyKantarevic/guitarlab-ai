const tools = [
  {
    href: "/practice-coach",
    title: "Practice Coach",
    description:
      "Upload a .wav take and get focused feedback, reference checks, and local practice history.",
  },
  {
    href: "/tone-maker/gp200",
    title: "GP-200 Tone Maker",
    description:
      "Generate deterministic Valeton GP-200 patch JSON with connection-aware dial-in notes.",
  },
];

export default function Home() {
  return (
    <main className="electric-shell px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center gap-8">
        <header className="max-w-3xl space-y-3">
          <p className="stage-kicker">GuitarLab AI</p>
          <h1 className="page-title text-4xl sm:text-6xl">
            Electric guitar tools for tone and practice.
          </h1>
          <p className="page-subtitle text-base sm:text-lg">
            Work on your playing, build GP-200 patches, and keep the signal
            chain structured.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <a
              className="panel-card block p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-[0_0_34px_rgba(34,211,238,0.18)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/50"
              href={tool.href}
              key={tool.href}
            >
              <h2 className="text-2xl font-semibold text-white">
                {tool.title}
              </h2>
              <p className="muted-copy mt-2 text-sm">{tool.description}</p>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
