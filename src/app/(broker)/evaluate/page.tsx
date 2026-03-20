"use client";

import { useBroker } from "@/lib/broker-context";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StepNav,
} from "@/components/ui";

const verdictStyle = {
  "strong-fit": "border-emerald-300/50 bg-emerald-50 text-emerald-800",
  "good-fit": "border-blue-300/50 bg-blue-50 text-blue-800",
  conditional: "border-amber-300/50 bg-amber-50 text-amber-800",
};

export default function EvaluatePage() {
  const { broker, selectProvider } = useBroker();

  if (broker.candidates.length === 0) {
    return (
      <>
        <PageHeader
          step="Step 02"
          title="Evaluate agents"
          description="Run a private evaluation first. Go back to the intake step."
        />
        <EmptyState text="No evaluation results yet. Return to Intake and run the private evaluation." />
        <StepNav back={{ href: "/", label: "Intake" }} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        step="Step 02"
        title="Private evaluation results"
        description="The broker has privately ranked candidates. Select the provider you want to delegate to."
      />

      <Card className="mb-8 border-[var(--border-strong)] bg-[var(--surface-1)]/70">
        <div className="flex flex-wrap items-center gap-3">
          <Badge label="testnet provider pool" variant="warning" />
          <p className="text-[0.82rem] leading-7 text-[var(--ink-soft)]">
            This shortlist is currently sourced from GhostBroker&apos;s testnet
            provider registry. Evaluation is real; provider identities are demo
            agents until we wire live registry discovery.
          </p>
        </div>
      </Card>

      {/* Memo */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-[0.92rem] font-semibold text-[var(--ink-strong)]">
            Redacted broker memo
          </h2>
          <Badge
            label={broker.providerUsed ?? "local"}
            variant={broker.providerUsed === "venice" ? "success" : "warning"}
          />
        </div>
        <div className="space-y-2.5">
          {broker.memo.map((line, i) => (
            <div
              key={`memo-${i}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[0.82rem] leading-7 text-[var(--ink-soft)]"
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Candidates */}
      <div>
        <h2 className="mb-5 text-[0.92rem] font-semibold text-[var(--ink-strong)]">
          Ranked candidates
        </h2>
        <div className="space-y-4">
          {broker.candidates.map((candidate, index) => {
            const isSelected = broker.selected?.agent.id === candidate.agent.id;

            return (
              <Card
                key={candidate.agent.id}
                className={`card-lift cursor-pointer transition-all ${
                  isSelected
                    ? "border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]/20"
                    : "hover:border-[var(--border-strong)]"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => selectProvider(candidate)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                          #{index + 1}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-medium uppercase tracking-[0.12em] ${
                            verdictStyle[candidate.verdict]
                          }`}
                        >
                          {candidate.verdict.replace("-", " ")}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-[var(--accent-blue)] px-2.5 py-1 text-[0.58rem] font-medium uppercase tracking-[0.12em] text-white">
                            selected
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2.5 font-[family:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.02em] text-[var(--ink-strong)]">
                        {candidate.agent.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        {candidate.agent.ens}
                      </p>
                      <p className="mt-2.5 text-[0.82rem] leading-7 text-[var(--ink-soft)]">
                        {candidate.agent.summary}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-center">
                      <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                        Score
                      </p>
                      <p className="mt-1.5 font-[family:var(--font-display)] text-2xl font-semibold text-[var(--ink-strong)]">
                        {candidate.score}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-1.5">
                    {candidate.rationales.map((r, ri) => (
                      <li
                        key={`${candidate.agent.id}-r-${ri}`}
                        className="text-[0.78rem] leading-6 text-[var(--ink-soft)]"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      <StepNav
        back={{ href: "/", label: "Intake" }}
        next={{ href: "/delegate" }}
        nextLabel="Configure delegation"
        nextDisabled={!broker.selected}
      />
    </>
  );
}
