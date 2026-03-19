const tracks = [
  {
    name: "OpenServ",
    value: "Anchor track",
    detail: "Multi-agent execution and service economy are core to the product.",
  },
  {
    name: "Base",
    value: "Paid agent service",
    detail: "Broker and specialists can expose paid services with discoverable execution flows.",
  },
  {
    name: "MetaMask",
    value: "Delegated authority",
    detail: "Wallet access stays permissioned instead of fully handed over.",
  },
  {
    name: "Uniswap",
    value: "Settlement layer",
    detail: "Agents can swap and route value before paying providers.",
  },
  {
    name: "Self + ENS",
    value: "Trust layer",
    detail: "Human-backed identity and readable agent names make the marketplace legible.",
  },
  {
    name: "Venice + Filecoin",
    value: "Differentiators",
    detail: "Private reasoning and durable receipts make the system defensible.",
  },
];

const flow = [
  {
    step: "01",
    title: "Post a job",
    body: "A human or agent submits a scoped task, a budget ceiling, and success criteria.",
  },
  {
    step: "02",
    title: "Privately evaluate",
    body: "The broker reasons over sensitive requirements and scores candidate agents without leaking context.",
  },
  {
    step: "03",
    title: "Delegate safely",
    body: "The user approves constrained actions instead of granting raw wallet control.",
  },
  {
    step: "04",
    title: "Settle and record",
    body: "The winning agent is paid onchain and the outcome is logged as a durable receipt.",
  },
];

const mvp = [
  "Single task type: research-and-execution procurement for onchain operations.",
  "Single broker agent that selects from a small registry of specialist agents.",
  "Constrained approval flow instead of open-ended wallet access.",
  "One real settlement path with receipt logging and submission-ready evidence.",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--surface-0)] text-[var(--ink-strong)]">
      <section className="relative isolate border-b border-[var(--border)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,144,92,0.28),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(36,87,255,0.18),_transparent_35%),linear-gradient(180deg,_rgba(255,246,235,0.95),_rgba(247,242,235,0.98))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(30,26,20,0.25),transparent)]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-14 md:px-10 lg:px-12 lg:py-18">
          <div className="flex flex-col gap-6 lg:max-w-4xl">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[rgba(255,250,244,0.75)] px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[var(--ink-muted)] backdrop-blur">
              <span>GhostBroker</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-coral)]" />
              <span>Synthesis build candidate</span>
            </div>
            <h1 className="max-w-5xl font-[family:var(--font-display)] text-5xl font-semibold leading-none tracking-[-0.05em] sm:text-6xl lg:text-8xl">
              Private agents.
              <br />
              Trusted actions.
              <br />
              Real settlement.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--ink-soft)] sm:text-xl">
              GhostBroker is an agent procurement layer for humans and agents who
              need work done without exposing strategy, leaking sensitive context,
              or handing over unrestricted wallet control.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.82)] p-6 shadow-[0_24px_60px_rgba(40,26,13,0.08)] backdrop-blur md:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                    Demo Shape
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    One coherent story across multiple tracks
                  </h2>
                </div>
                <div className="rounded-full bg-[var(--accent-blue)] px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-white">
                  Aim: win one, qualify many
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {flow.map((item) => (
                  <article
                    key={item.step}
                    className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-5"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                      {item.step}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--ink-strong)] p-6 text-[var(--surface-0)] shadow-[0_24px_60px_rgba(14,17,35,0.24)] md:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                Why this angle
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                It matches the hackathon thesis directly.
              </h2>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-[rgba(255,247,238,0.78)]">
                <li>Agents need to pay.</li>
                <li>Agents need to be trusted.</li>
                <li>Agents need to coordinate under constraints.</li>
                <li>Judges want real execution, not sponsor bingo.</li>
              </ul>
              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-gold)]">
                  Narrow MVP
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[rgba(255,247,238,0.82)]">
                  {mvp.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-0),#efe7dc)]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-18">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              Sponsor map
            </p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-0.04em]">
              Build once. Show native leverage across the strongest tracks.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-8 text-[var(--ink-soft)]">
              The point is not to artificially bolt together integrations. The
              point is to make each integration feel necessary to the product&apos;s
              trust, payment, or coordination model.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tracks.map((track) => (
              <article
                key={track.name}
                className="rounded-[1.75rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.88)] p-5 shadow-[0_18px_45px_rgba(42,28,18,0.06)]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  {track.name}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
                  {track.value}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  {track.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ink-strong)] text-[var(--surface-0)]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 md:px-10 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:py-18">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-gold)]">
              Build target
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em]">
              The first version is not a marketplace. It is a decisive workflow.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[rgba(255,247,238,0.78)]">
              We only need one convincing end-to-end procurement run: task intake,
              private evaluation, delegated approval, payment, and a durable
              receipt. If that path is real, the submission will read as product,
              not prototype theater.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent-gold)]">
              Immediate next steps
            </p>
            <ol className="mt-4 space-y-4 text-sm leading-7 text-[rgba(255,247,238,0.82)]">
              <li>Lock the final name and the first supported task type.</li>
              <li>Wire a minimal UI that demonstrates the broker workflow.</li>
              <li>Attach real sponsor integrations as load-bearing pieces.</li>
              <li>Keep the submission draft updated in parallel with the code.</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
