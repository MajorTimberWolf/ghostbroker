"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrokerProvider, useBroker, type WorkflowStep } from "@/lib/broker-context";
import { formatAddress } from "@/lib/metamask";
import { Badge, Card, SectionLabel } from "@/components/ui";

const steps: { id: WorkflowStep; label: string; href: string }[] = [
  { id: "intake", label: "Intake", href: "/" },
  { id: "evaluate", label: "Evaluate", href: "/evaluate" },
  { id: "delegate", label: "Delegate", href: "/delegate" },
  { id: "settle", label: "Settle", href: "/settle" },
];

function pathToStep(path: string): WorkflowStep {
  if (path === "/evaluate") return "evaluate";
  if (path === "/delegate") return "delegate";
  if (path === "/settle") return "settle";
  return "intake";
}

/* ── Top navigation bar ── */

function TopNav() {
  const pathname = usePathname();
  const { completedSteps, wallet, broker, connectWallet } = useBroker();
  const activeStep = pathToStep(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ink-strong)]">
            <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="currentColor">
              <path d="M8 1.5a5 5 0 0 0-5 5c0 2.1 1.3 3.8 3 4.6L5.5 14h5l-.5-2.9c1.7-.8 3-2.5 3-4.6a5 5 0 0 0-5-5Z" />
            </svg>
          </div>
          <span className="font-[family:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[var(--ink-strong)]">
            GhostBroker
          </span>
        </Link>

        {/* Center: Step indicators */}
        <nav className="hidden items-center gap-1 md:flex">
          {steps.map((step, i) => {
            const isActive = step.id === activeStep;
            const isDone = completedSteps.has(step.id);
            const isLast = i === steps.length - 1;

            return (
              <div key={step.id} className="flex items-center">
                <Link
                  href={step.href}
                  className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.78rem] font-medium transition-all ${
                    isActive
                      ? "bg-[var(--ink-strong)] text-white"
                      : isDone
                        ? "text-[var(--ink-strong)] hover:bg-[var(--surface-2)]"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"
                  }`}
                >
                  {/* Indicator dot */}
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      isDone
                        ? "bg-[var(--step-done)]"
                        : isActive
                          ? "bg-white"
                          : "bg-[var(--step-pending)]"
                    }`}
                  />
                  {step.label}
                </Link>

                {/* Connector */}
                {!isLast && (
                  <div
                    className={`mx-0.5 h-px w-4 transition-colors ${
                      isDone ? "bg-[var(--step-done)]" : "bg-[var(--border)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* Right: Wallet + Providers */}
        <div className="flex items-center gap-3">
          {/* Provider pills -- tiny, only show when active */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {[
              { label: "Venice", active: broker.providerUsed === "venice" },
              { label: "Filecoin", active: broker.receiptProviderUsed === "filecoin" },
            ].map(
              (p) =>
                p.active && (
                  <span
                    key={p.label}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-emerald-700"
                  >
                    {p.label}
                  </span>
                ),
            )}
          </div>

          {/* Wallet button */}
          <button
            type="button"
            onClick={() => void connectWallet()}
            disabled={wallet.isConnecting || wallet.isHydrating}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.75rem] font-medium transition ${
              wallet.account
                ? "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink-strong)] hover:border-[var(--border-strong)]"
                : "bg-[var(--ink-strong)] text-white hover:bg-[var(--ink-body)]"
            }`}
          >
            {wallet.account ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--step-done)]" />
                {formatAddress(wallet.account)}
              </>
            ) : wallet.isHydrating ? (
              "Scanning..."
            ) : (
              "Connect wallet"
            )}
          </button>
        </div>
      </div>

      {/* Mobile step dots */}
      <div className="flex justify-center gap-2 border-t border-[var(--border)] py-2 md:hidden">
        {steps.map((step) => {
          const isActive = step.id === activeStep;
          const isDone = completedSteps.has(step.id);
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-medium transition ${
                isActive
                  ? "bg-[var(--ink-strong)] text-white"
                  : isDone
                    ? "text-[var(--ink-strong)]"
                    : "text-[var(--ink-muted)]"
              }`}
            >
              <span
                className={`h-1 w-1 rounded-full ${
                  isDone ? "bg-[var(--step-done)]" : isActive ? "bg-white" : "bg-[var(--step-pending)]"
                }`}
              />
              {step.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

/* ── Layout shell ── */

function BrokerLayoutInner({ children }: { children: ReactNode }) {
  const { broker } = useBroker();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 lg:py-16">
          {children}
          <RealityCheckCard
            veniceActive={broker.providerUsed === "venice"}
            receiptLive={broker.receiptProviderUsed === "filecoin"}
            approvalMode={broker.approvalMode}
          />
        </div>
      </main>
    </div>
  );
}

function RealityCheckCard({
  veniceActive,
  receiptLive,
  approvalMode,
}: {
  veniceActive: boolean;
  receiptLive: boolean;
  approvalMode: "wallet-granted" | "simulated" | null;
}) {
  const rows = [
    {
      label: "Venice",
      detail: veniceActive
        ? "Real server-side private evaluation is active."
        : "Real server-side private evaluation drives ranking and memo.",
      badge: "real",
      variant: "success" as const,
    },
    {
      label: "MetaMask",
      detail:
        approvalMode === "wallet-granted"
          ? "Real ERC-7715 execution permission granted by wallet."
          : approvalMode === "simulated"
            ? "Real ERC-7715 request path, simulated only when wallet support is missing."
            : "Real ERC-7715 request path with honest fallback when wallet support is missing.",
      badge:
        approvalMode === "wallet-granted"
          ? "wallet-granted"
          : approvalMode === "simulated"
            ? "simulated"
            : "hybrid",
      variant: approvalMode === "simulated" ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Uniswap",
      detail: "Real Base Sepolia quote and settlement execution path.",
      badge: "real",
      variant: "success" as const,
    },
    {
      label: "Filecoin",
      detail: receiptLive
        ? "Receipt pinned through Lighthouse with verifiable IPFS/Filecoin anchor."
        : "Receipt storage is real in deployed runs, with an honest local fallback if storage is unavailable.",
      badge: receiptLive ? "filecoin" : "hybrid",
      variant: receiptLive ? ("success" as const) : ("warning" as const),
    },
    {
      label: "ENS",
      detail: "Display names only in this build. No onchain ENS registration or resolution yet.",
      badge: "cosmetic",
      variant: "warning" as const,
    },
  ];

  return (
    <Card className="mt-10 overflow-hidden border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,246,240,0.9))]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SectionLabel>Reality check</SectionLabel>
          <p className="mt-2 max-w-lg text-[0.82rem] leading-7 text-[var(--ink-soft)]">
            This is the fast judge view of what is real, what is hybrid, and what is still just presentation.
          </p>
        </div>
        <Badge label="Judge map" variant="neutral" />
      </div>

      <div className="mt-5 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white/80">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-3 px-4 py-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center"
          >
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
              {row.label}
            </p>
            <p className="text-[0.8rem] leading-6 text-[var(--ink-soft)]">{row.detail}</p>
            <div className="sm:justify-self-end">
              <Badge label={row.badge} variant={row.variant} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function BrokerLayout({ children }: { children: ReactNode }) {
  return (
    <BrokerProvider>
      <BrokerLayoutInner>{children}</BrokerLayoutInner>
    </BrokerProvider>
  );
}
