"use client";

import { useBroker } from "@/lib/broker-context";
import {
  Badge,
  Card,
  EmptyState,
  KV,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  StepNav,
} from "@/components/ui";

export default function SettlePage() {
  const { broker, executeSettlement, reset, selectProvider } = useBroker();

  if (!broker.approved || !broker.settlement) {
    return (
      <>
        <PageHeader
          step="Step 04"
          title="Settle and receive"
          description="Approve the delegation first. Go back to the delegation step."
        />
        <EmptyState text="Delegation not yet approved. Return to Delegate and approve the bounded scope." />
        <StepNav back={{ href: "/delegate", label: "Delegate" }} />
      </>
    );
  }

  const settlement = broker.settlement;
  const hasTxExecution = Boolean(broker.receipt?.txHash ?? settlement.txHash);
  const isLiveExecution = hasTxExecution || broker.settlementProviderUsed === "uniswap";
  const txHash = broker.receipt?.txHash ?? settlement.txHash;

  return (
    <>
      <PageHeader
        step="Step 04"
        title="Settlement and receipt"
        description={
          isLiveExecution
            ? "Execute the bounded settlement and store a durable receipt onchain."
            : "Record the settlement plan and store a durable receipt while live execution remains unavailable."
        }
      />

      <div className="space-y-5">
        {/* Settlement plan */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <SectionLabel>Settlement path</SectionLabel>
            {broker.settlementProviderUsed && (
              <Badge
                label={broker.settlementProviderUsed}
                variant={
                  broker.settlementProviderUsed === "uniswap" ? "success" : "warning"
                }
              />
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 mb-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Route
            </p>
            <p className="mt-1.5 font-[family:var(--font-display)] text-[1.05rem] font-semibold text-[var(--ink-strong)]">
              {settlement.route}
            </p>
            <p className="mt-1 text-[0.78rem] leading-6 text-[var(--ink-soft)]">
              {settlement.settlementNote}
            </p>
          </div>

          <div className="space-y-0">
            <KV
              label="Execution quote"
              value={`${settlement.quoteAmount} ${settlement.payoutToken}`}
            />
            <KV
              label="Broker fee"
              value={`${settlement.brokerFee} ${settlement.fundingToken}`}
            />
            <KV
              label="Safety reserve"
              value={`${settlement.reserve} ${settlement.fundingToken}`}
            />
            {settlement.requestId && (
              <KV label="Request ID" value={settlement.requestId} />
            )}
            {settlement.routing && (
              <KV label="Routing" value={settlement.routing} />
            )}
            {settlement.gasEstimateUSD && (
              <KV label="Est. gas" value={`$${settlement.gasEstimateUSD}`} />
            )}
          </div>

          {/* Diagnostics */}
          {broker.settlementDiagnostics.length > 0 && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
              <SectionLabel>Quote diagnostics</SectionLabel>
              <ul className="mt-2 space-y-1.5">
                {broker.settlementDiagnostics.map((d, i) => (
                  <li
                    key={`sd-${i}`}
                    className="text-[0.78rem] leading-6 text-[var(--ink-soft)]"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {broker.settlementPending && (
            <p className="mt-4 text-[0.78rem] text-[var(--ink-muted)]">
              Refreshing settlement quote...
            </p>
          )}

          {broker.settlementError && (
            <div className="mt-4 rounded-xl border border-rose-200/70 bg-rose-50/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.82rem] text-rose-700">{broker.settlementError}</p>
                {broker.selected && (
                  <SecondaryButton
                    className="w-auto px-4 py-2.5 text-[0.75rem]"
                    onClick={() => selectProvider(broker.selected!)}
                  >
                    Retry quote
                  </SecondaryButton>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Execute button */}
        {!broker.settled && (
          <PrimaryButton
            onClick={() => void executeSettlement()}
            disabled={broker.receiptPending || broker.settlementPending}
            variant="blue"
          >
            {broker.settlementPending
              ? "Refreshing settlement quote..."
              : broker.receiptPending
              ? "Writing receipt bundle..."
              : isLiveExecution
                ? "Execute bounded settlement"
                : "Record settlement plan + receipt"}
          </PrimaryButton>
        )}

        {broker.receiptError && (
          <Card className="border-rose-200/70 bg-rose-50/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.82rem] text-rose-700">{broker.receiptError}</p>
              <SecondaryButton
                className="w-auto px-4 py-2.5 text-[0.75rem]"
                onClick={() => void executeSettlement()}
                disabled={broker.receiptPending}
              >
                Retry receipt
              </SecondaryButton>
            </div>
          </Card>
        )}

        {/* Receipt */}
        {broker.receipt && (
          <Card
            className={
              broker.receiptProviderUsed === "filecoin"
                ? "border-emerald-200/60 bg-emerald-50/20"
                : ""
            }
          >
            <div className="flex items-center gap-3 mb-4">
              <SectionLabel>Receipt bundle</SectionLabel>
              <Badge
                label={
                  broker.receiptProviderUsed === "filecoin"
                    ? "filecoin"
                    : "local"
                }
                variant={
                  broker.receiptProviderUsed === "filecoin" ? "success" : "warning"
                }
              />
            </div>

            <div className="space-y-0">
              <KV label="Receipt ID" value={broker.receipt.id} />
              <KV label="Provider" value={broker.receipt.providerEns} />
              <KV
                label="Payout"
                value={`${broker.receipt.amount} ${broker.receipt.token}`}
              />
              {txHash && (
                <KV
                  label="Transaction"
                  value={txHash}
                />
              )}
              <KV label="Receipt anchor" value={broker.receipt.receiptAnchor} />
            </div>

            {txHash && (
              <a
                className="mt-4 inline-flex rounded-xl border border-[var(--border-strong)] bg-white px-4 py-2 text-[0.78rem] font-medium text-[var(--ink-strong)] transition hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                rel="noreferrer"
                target="_blank"
              >
                View tx on Base Sepolia
              </a>
            )}

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
              {!isLiveExecution && (
                <p className="text-[0.82rem] leading-7 text-[var(--ink-soft)]">
                  Settlement plan recorded. Live onchain execution is still pending a
                  funded environment with a supported quote path.
                </p>
              )}
              <p className="text-[0.82rem] leading-7 text-[var(--ink-soft)]">
                {broker.receipt.storagePlan}
              </p>
              <p className="text-[0.82rem] leading-7 text-[var(--ink-soft)]">
                {broker.receipt.trustUpdate}
              </p>
              <p className="text-[0.82rem] leading-7 text-[var(--ink-soft)]">
                {broker.receipt.executionSummary}
              </p>
            </div>

            {broker.receiptDiagnostics.length > 0 && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                <SectionLabel>Receipt diagnostics</SectionLabel>
                <ul className="mt-2 space-y-1.5">
                  {broker.receiptDiagnostics.map((d, i) => (
                    <li
                      key={`rd-${i}`}
                      className="text-[0.78rem] leading-6 text-[var(--ink-soft)]"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Completed state */}
        {broker.settled && broker.receipt && (
          <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/20 p-6 text-center">
            <p className="font-[family:var(--font-display)] text-[1.3rem] font-semibold tracking-[-0.02em] text-emerald-800">
              {isLiveExecution ? "Workflow complete" : "Workflow recorded"}
            </p>
            <p className="mt-2 text-[0.82rem] leading-7 text-emerald-700/80">
              {hasTxExecution
                ? "Task evaluated privately, delegation bounded, settlement executed, receipt stored durably."
                : "Task evaluated privately, delegation bounded, settlement plan recorded, receipt stored durably."}
            </p>
            <button
              type="button"
              className="mt-5 rounded-xl border border-emerald-300/50 bg-white px-6 py-3 text-[0.82rem] font-medium text-emerald-800 transition hover:bg-emerald-50"
              onClick={() => {
                reset();
                window.location.href = "/";
              }}
            >
              Start a new task
            </button>
          </div>
        )}
      </div>

      <StepNav
        back={{ href: "/delegate", label: "Delegate" }}
      />
    </>
  );
}
