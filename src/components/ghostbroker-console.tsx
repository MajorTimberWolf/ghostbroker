"use client";

import { useState } from "react";

import {
  buildDelegationPlan,
  buildReceipt,
  buildSettlementPlan,
  defaultTask,
  taskFingerprint,
  type BrokerEvaluationResponse,
  type CandidateEvaluation,
  type Confidentiality,
  type DelegationPlan,
  type EvaluationProvider,
  type Receipt,
  type SettlementPlan,
  type TaskForm,
  type Urgency,
} from "@/lib/ghostbroker";

type RunState = {
  memo: string[];
  candidates: CandidateEvaluation[];
  selected: CandidateEvaluation | null;
  delegation: DelegationPlan | null;
  settlement: SettlementPlan | null;
  receipt: Receipt | null;
  approved: boolean;
  settled: boolean;
  evaluationId: string | null;
  taskSnapshot: TaskForm | null;
  providerUsed: EvaluationProvider | null;
  isLoading: boolean;
  error: string | null;
};

const initialRunState: RunState = {
  memo: [],
  candidates: [],
  selected: null,
  delegation: null,
  settlement: null,
  receipt: null,
  approved: false,
  settled: false,
  evaluationId: null,
  taskSnapshot: null,
  providerUsed: null,
  isLoading: false,
  error: null,
};

const verdictTone = {
  "strong-fit": "border-emerald-400/45 bg-emerald-50 text-emerald-900",
  "good-fit": "border-blue-400/35 bg-blue-50 text-blue-900",
  conditional: "border-amber-400/40 bg-amber-50 text-amber-900",
};

function sectionCardClasses(tall = false) {
  return `rounded-[1.75rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.9)] p-5 shadow-[0_18px_45px_rgba(42,28,18,0.06)] ${tall ? "h-full" : ""}`;
}

function providerTone(providerUsed: EvaluationProvider | null) {
  if (providerUsed === "venice") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  return "border-amber-300 bg-amber-50 text-amber-900";
}

export function GhostBrokerConsole() {
  const [task, setTask] = useState<TaskForm>(defaultTask);
  const [run, setRun] = useState<RunState>(initialRunState);

  function updateTask<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
    setTask((current) => ({ ...current, [key]: value }));
  }

  async function handleEvaluate() {
    setRun((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    const response = await fetch("/api/broker/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      setRun((current) => ({
        ...current,
        isLoading: false,
        error: "Broker evaluation failed. Retry the request.",
      }));
      return;
    }

    const payload = (await response.json()) as BrokerEvaluationResponse;

    setRun({
      memo: payload.memo,
      candidates: payload.candidates,
      selected: null,
      delegation: null,
      settlement: null,
      receipt: null,
      approved: false,
      settled: false,
      evaluationId: payload.evaluationId,
      taskSnapshot: payload.taskSnapshot,
      providerUsed: payload.providerUsed,
      isLoading: false,
      error: null,
    });
  }

  function handleSelect(candidate: CandidateEvaluation) {
    if (!run.taskSnapshot) return;

    const taskSnapshot = run.taskSnapshot;

    setRun((current) => ({
      ...current,
      selected: candidate,
      delegation: buildDelegationPlan(taskSnapshot, candidate),
      settlement: buildSettlementPlan(taskSnapshot, candidate),
      receipt: null,
      approved: false,
      settled: false,
    }));
  }

  function handleApprove() {
    setRun((current) => ({
      ...current,
      approved: true,
    }));
  }

  function handleSettle() {
    if (!run.selected || !run.settlement || !run.taskSnapshot) return;

    const selected = run.selected;
    const settlement = run.settlement;
    const taskSnapshot = run.taskSnapshot;

    setRun((current) => ({
      ...current,
      settled: true,
      receipt: buildReceipt(taskSnapshot, selected, settlement),
    }));
  }

  function handleReset() {
    setTask(defaultTask);
    setRun(initialRunState);
  }

  const hasTaskDrift =
    run.taskSnapshot !== null &&
    taskFingerprint(task) !== taskFingerprint(run.taskSnapshot);

  return (
    <main className="min-h-screen bg-[var(--surface-0)] text-[var(--ink-strong)]">
      <section className="border-b border-[var(--border)] bg-[radial-gradient(circle_at_top_left,_rgba(255,144,92,0.22),_transparent_32%),radial-gradient(circle_at_85%_15%,_rgba(36,87,255,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,246,235,0.96),_rgba(247,242,235,0.98))]">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[rgba(255,250,244,0.7)] px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[var(--ink-muted)]">
                <span>GhostBroker Console</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-coral)]" />
                <span>Venice-first workflow</span>
              </div>
              <h1 className="mt-5 font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Intake, evaluate privately, delegate narrowly, settle onchain.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
                This is the first working broker path. It is intentionally narrow:
                one task, one ranked shortlist, one delegated approval scope, one
                settlement plan, and one receipt bundle.
              </p>
            </div>

            <div className="grid gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)] md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,252,248,0.86)] px-4 py-3">
                <div>Anchor</div>
                <div className="mt-2 text-[var(--ink-strong)]">Venice</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,252,248,0.86)] px-4 py-3">
                <div>Auth</div>
                <div className="mt-2 text-[var(--ink-strong)]">MetaMask Delegations</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,252,248,0.86)] px-4 py-3">
                <div>Settlement</div>
                <div className="mt-2 text-[var(--ink-strong)]">Uniswap</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
        <div className="space-y-6">
          <div className={sectionCardClasses()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                  01 Intake
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Task profile
                </h2>
              </div>
              <button
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--border-strong)] hover:bg-white"
                onClick={handleReset}
                type="button"
              >
                Reset
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Task title</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-blue)]"
                  value={task.title}
                  onChange={(event) => updateTask("title", event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Objective</span>
                <textarea
                  className="min-h-36 rounded-3xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-blue)]"
                  value={task.objective}
                  onChange={(event) => updateTask("objective", event.target.value)}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Budget ceiling</span>
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-blue)]"
                    min={200}
                    step={50}
                    type="number"
                    value={task.budget}
                    onChange={(event) => updateTask("budget", Number(event.target.value))}
                  />
                </label>

                <SelectField<Urgency>
                  label="Urgency"
                  value={task.urgency}
                  options={[
                    ["today", "Today"],
                    ["48h", "48 hours"],
                    ["this-week", "This week"],
                  ]}
                  onChange={(value) => updateTask("urgency", value)}
                />

                <SelectField<Confidentiality>
                  label="Confidentiality"
                  value={task.confidentiality}
                  options={[
                    ["standard", "Standard"],
                    ["sensitive", "Sensitive"],
                    ["sealed", "Sealed"],
                  ]}
                  onChange={(value) => updateTask("confidentiality", value)}
                />

                <SelectField<TaskForm["payoutToken"]>
                  label="Funding token"
                  value={task.payoutToken}
                  options={[
                    ["USDC", "USDC"],
                    ["ETH", "ETH"],
                    ["cUSD", "cUSD"],
                  ]}
                  onChange={(value) => updateTask("payoutToken", value)}
                />
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <ToggleRow
                  checked={task.requiresHumanIdentity}
                  label="Require human-backed agent identity"
                  onChange={(checked) => updateTask("requiresHumanIdentity", checked)}
                />
                <ToggleRow
                  checked={task.requiresPersistentReceipts}
                  label="Require durable receipts and provenance"
                  onChange={(checked) =>
                    updateTask("requiresPersistentReceipts", checked)
                  }
                />
                <ToggleRow
                  checked={task.requiresAutonomy}
                  label="Require autonomous completion"
                  onChange={(checked) => updateTask("requiresAutonomy", checked)}
                />
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-[1.25rem] bg-[var(--accent-blue)] px-5 py-4 font-medium text-white transition hover:brightness-110"
              onClick={handleEvaluate}
              type="button"
            >
              {run.isLoading ? "Evaluating…" : "Run private evaluation"}
            </button>

            {run.error ? (
              <p className="mt-3 text-sm text-rose-700">{run.error}</p>
            ) : null}

            {hasTaskDrift ? (
              <div className="mt-4 rounded-[1.3rem] border border-[var(--accent-gold)] bg-[rgba(240,195,107,0.15)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                The form has changed since the last evaluation. Downstream steps
                are still tied to evaluation{" "}
                <span className="font-mono">{run.evaluationId}</span>. Re-run the
                broker when you want a fresh ranking.
              </div>
            ) : null}
          </div>

          <div className={sectionCardClasses()}>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              02 Private memo
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Redacted broker reasoning
            </h2>
            {run.providerUsed ? (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] ${providerTone(run.providerUsed)}`}
              >
                <span>Provider</span>
                <span>{run.providerUsed}</span>
              </div>
            ) : null}
            <div className="mt-5 grid gap-3">
              {run.memo.length === 0 ? (
                <EmptyState text="No private evaluation yet. Run the broker on the task profile to generate the internal memo." />
              ) : (
                run.memo.map((item, index) => (
                  <div
                    key={`memo-${index}`}
                    className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]"
                  >
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={sectionCardClasses()}>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              03 Ranked providers
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Candidate shortlist
            </h2>

            <div className="mt-5 grid gap-4">
              {run.candidates.length === 0 ? (
                <EmptyState text="The shortlist appears here after private evaluation." />
              ) : (
                run.candidates.map((candidate, index) => {
                  const selected = run.selected?.agent.id === candidate.agent.id;

                  return (
                    <article
                      key={candidate.agent.id}
                      className={`rounded-[1.5rem] border p-4 transition ${
                        selected
                          ? "border-[var(--accent-blue)] bg-blue-50/60"
                          : "border-[var(--border)] bg-[var(--surface-1)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                              #{index + 1}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${verdictTone[candidate.verdict]}`}
                            >
                              {candidate.verdict.replace("-", " ")}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
                            {candidate.agent.name}
                          </h3>
                          <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                            {candidate.agent.ens}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                            {candidate.agent.summary}
                          </p>
                        </div>

                        <div className="rounded-[1.25rem] border border-[var(--border)] bg-white px-4 py-3 text-right">
                          <div className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                            Broker score
                          </div>
                          <div className="mt-2 text-3xl font-semibold">
                            {candidate.score}
                          </div>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--ink-soft)]">
                        {candidate.rationales.map((reason, reasonIndex) => (
                          <li key={`${candidate.agent.id}-reason-${reasonIndex}`}>
                            {reason}
                          </li>
                        ))}
                      </ul>

                      <button
                        className={`mt-5 rounded-full px-4 py-2 text-sm transition ${
                          selected
                            ? "bg-[var(--ink-strong)] text-white"
                            : "border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white"
                        }`}
                        onClick={() => handleSelect(candidate)}
                        type="button"
                      >
                        {selected ? "Selected provider" : "Select provider"}
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className={sectionCardClasses(true)}>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                04 Delegation plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                MetaMask-style approval scope
              </h2>
              {!run.delegation ? (
                <div className="mt-5">
                  <EmptyState text="Pick a provider to generate the bounded delegation scope." />
                </div>
              ) : (
                <>
                  {run.taskSnapshot ? (
                    <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                      Delegation is scoped to the frozen task snapshot for
                      <span className="ml-2 font-medium text-[var(--ink-strong)]">
                        {run.taskSnapshot.title}
                      </span>
                      .
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm">
                    <KeyValue label="Delegate" value={run.delegation.delegate} />
                    <KeyValue
                      label="Spend cap"
                      value={`${run.delegation.spendCap} ${run.taskSnapshot?.payoutToken ?? task.payoutToken}`}
                    />
                    <KeyValue label="Chain" value={run.delegation.chain} />
                    <KeyValue
                      label="Expiry"
                      value={`${run.delegation.expiryHours} hours`}
                    />
                  </div>

                  <ListBlock
                    title="Allowed actions"
                    items={run.delegation.permissions}
                  />
                  <ListBlock title="Guardrails" items={run.delegation.guardrails} />

                  <button
                    className={`mt-5 w-full rounded-[1.25rem] px-5 py-4 font-medium transition ${
                      run.approved
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--ink-strong)] text-white hover:brightness-110"
                    }`}
                    disabled={run.approved}
                    onClick={handleApprove}
                    type="button"
                  >
                    {run.approved ? "Delegation approved" : "Approve bounded delegation"}
                  </button>
                </>
              )}
            </div>

            <div className={sectionCardClasses(true)}>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                05 Settlement path
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Uniswap-style execution plan
              </h2>
              {!run.settlement ? (
                <div className="mt-5">
                  <EmptyState text="Select a provider to generate the payout route." />
                </div>
              ) : (
                <>
                  <div className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      Route
                    </p>
                    <p className="mt-2 text-lg font-semibold">{run.settlement.route}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      {run.settlement.settlementNote}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    <KeyValue
                      label="Execution quote"
                      value={`${run.settlement.quoteAmount} ${run.settlement.payoutToken}`}
                    />
                    <KeyValue
                      label="Broker fee"
                      value={`${run.settlement.brokerFee} ${run.settlement.fundingToken}`}
                    />
                    <KeyValue
                      label="Safety reserve"
                      value={`${run.settlement.reserve} ${run.settlement.fundingToken}`}
                    />
                  </div>

                  <button
                    className={`mt-5 w-full rounded-[1.25rem] px-5 py-4 font-medium transition ${
                      !run.approved
                        ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                        : run.settled
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--accent-blue)] text-white hover:brightness-110"
                    }`}
                    disabled={!run.approved || run.settled}
                    onClick={handleSettle}
                    type="button"
                  >
                    {run.settled ? "Settlement executed" : "Execute bounded settlement"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={sectionCardClasses()}>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              06 Receipt bundle
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Durable proof of execution
            </h2>

            {!run.receipt ? (
              <div className="mt-5">
                <EmptyState text="Receipt bundle is emitted after settlement completes." />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <KeyValue label="Receipt ID" value={run.receipt.id} />
                  <KeyValue label="Provider" value={run.receipt.providerEns} />
                  <KeyValue
                    label="Payout"
                    value={`${run.receipt.amount} ${run.receipt.token}`}
                  />
                  <KeyValue
                    label="Receipt anchor"
                    value={run.receipt.receiptAnchor}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
                  <p>{run.receipt.storagePlan}</p>
                  <p className="mt-4">{run.receipt.trustUpdate}</p>
                  <p className="mt-4">{run.receipt.executionSummary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <select
        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-blue)]"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--ink-soft)]">{label}</span>
      <button
        aria-pressed={checked}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
          checked ? "bg-[var(--accent-blue)]" : "bg-zinc-300"
        }`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`ml-1 h-6 w-6 rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2 last:border-b-0">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
        {label}
      </span>
      <span className="text-right text-sm text-[var(--ink-strong)]">{value}</span>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink-soft)]">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[rgba(255,252,248,0.7)] px-4 py-6 text-sm leading-7 text-[var(--ink-muted)]">
      {text}
    </div>
  );
}
