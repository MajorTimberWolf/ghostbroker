"use client";

import { useBroker } from "@/lib/broker-context";
import { Card, PageHeader, PrimaryButton, StepNav } from "@/components/ui";
import type { Confidentiality, Urgency } from "@/lib/ghostbroker";

export default function IntakePage() {
  const { broker, updateTask, runEvaluation, hasTaskDrift } = useBroker();
  const task = broker.task;

  return (
    <>
      <PageHeader
        step="Step 01"
        title="Define the task"
        description="Describe what you need done, set constraints, and the broker will privately evaluate which agents are best suited."
      />

      <div className="space-y-5">
        <Card>
          <div className="space-y-5">
            <label className="block">
              <span className="text-[0.78rem] font-medium text-[var(--ink-strong)]">
                Task title
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[0.88rem] outline-none transition focus:border-[var(--accent-blue)]"
                value={task.title}
                onChange={(e) => updateTask("title", e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-[0.78rem] font-medium text-[var(--ink-strong)]">
                Objective
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[0.88rem] leading-7 outline-none transition focus:border-[var(--accent-blue)]"
                value={task.objective}
                onChange={(e) => updateTask("objective", e.target.value)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[0.78rem] font-medium text-[var(--ink-strong)]">
                  Budget ceiling
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[0.88rem] outline-none transition focus:border-[var(--accent-blue)]"
                  type="number"
                  min={200}
                  step={50}
                  value={task.budget}
                  onChange={(e) => updateTask("budget", Number(e.target.value))}
                />
              </label>

              <label className="block">
                <span className="text-[0.78rem] font-medium text-[var(--ink-strong)]">
                  Urgency
                </span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[0.88rem] outline-none transition focus:border-[var(--accent-blue)]"
                  value={task.urgency}
                  onChange={(e) => updateTask("urgency", e.target.value as Urgency)}
                >
                  <option value="today">Today</option>
                  <option value="48h">48 hours</option>
                  <option value="this-week">This week</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[0.78rem] font-medium text-[var(--ink-strong)]">
                  Confidentiality
                </span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[0.88rem] outline-none transition focus:border-[var(--accent-blue)]"
                  value={task.confidentiality}
                  onChange={(e) =>
                    updateTask("confidentiality", e.target.value as Confidentiality)
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="sensitive">Sensitive</option>
                  <option value="sealed">Sealed</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[0.78rem] font-medium text-[var(--ink-strong)]">
                  Funding token
                </span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[0.88rem] outline-none transition focus:border-[var(--accent-blue)]"
                  value={task.payoutToken}
                  onChange={(e) =>
                    updateTask("payoutToken", e.target.value as "USDC" | "ETH" | "cUSD")
                  }
                >
                  <option value="USDC">USDC</option>
                  <option value="ETH">ETH</option>
                  <option value="cUSD">cUSD</option>
                </select>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <p className="mb-4 text-[0.78rem] font-medium text-[var(--ink-strong)]">
            Requirements
          </p>
          <div className="space-y-3">
            <ToggleRow
              label="Require human-backed agent identity"
              checked={task.requiresHumanIdentity}
              onChange={(v) => updateTask("requiresHumanIdentity", v)}
            />
            <ToggleRow
              label="Require durable receipts and provenance"
              checked={task.requiresPersistentReceipts}
              onChange={(v) => updateTask("requiresPersistentReceipts", v)}
            />
            <ToggleRow
              label="Require autonomous completion"
              checked={task.requiresAutonomy}
              onChange={(v) => updateTask("requiresAutonomy", v)}
            />
          </div>
        </Card>

        {broker.error && (
          <p className="text-[0.82rem] text-rose-700">{broker.error}</p>
        )}

        {hasTaskDrift && (
          <Card className="border-[var(--accent-gold)]/40 bg-amber-50/40">
            <p className="text-[0.82rem] leading-7 text-[var(--ink-soft)]">
              Task has changed since last evaluation. Run again for a fresh ranking.
            </p>
          </Card>
        )}

        <PrimaryButton
          onClick={() => void runEvaluation()}
          disabled={broker.isLoading}
        >
          {broker.isLoading ? "Running private evaluation..." : "Run private evaluation"}
        </PrimaryButton>
      </div>

      <StepNav
        next={{ href: "/evaluate" }}
        nextLabel="View evaluation"
        nextDisabled={broker.candidates.length === 0}
      />
    </>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-[0.82rem] text-[var(--ink-soft)]">{label}</span>
      <button
        aria-pressed={checked}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          checked ? "bg-[var(--accent-blue)]" : "bg-zinc-300"
        }`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`ml-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
