"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrokerProvider, useBroker, type WorkflowStep } from "@/lib/broker-context";
import { formatAddress } from "@/lib/metamask";

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
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}

export function BrokerLayout({ children }: { children: ReactNode }) {
  return (
    <BrokerProvider>
      <BrokerLayoutInner>{children}</BrokerLayoutInner>
    </BrokerProvider>
  );
}
