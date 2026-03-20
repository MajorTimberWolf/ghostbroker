"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/* ─── Page header ─── */

export function PageHeader({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-10">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--ink-muted)]">
        {step}
      </p>
      <h1 className="mt-3 font-[family:var(--font-display)] text-[2rem] font-semibold leading-[1.15] tracking-[-0.04em] text-[var(--ink-strong)] sm:text-[2.6rem]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[0.95rem] leading-7 text-[var(--ink-soft)]">
        {description}
      </p>
    </header>
  );
}

/* ─── Card ─── */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[0_1px_3px_rgba(26,20,16,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Key-Value row ─── */

export function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <span className="max-w-[38%] font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        {label}
      </span>
      <span className="max-w-[62%] min-w-0 break-all text-right text-[0.82rem] text-[var(--ink-strong)]">
        {value}
      </span>
    </div>
  );
}

/* ─── Badge ─── */

export function Badge({
  label,
  variant = "neutral",
}: {
  label: string;
  variant?: "success" | "warning" | "neutral";
}) {
  const tone =
    variant === "success"
      ? "border-emerald-300/50 bg-emerald-50 text-emerald-800"
      : variant === "warning"
        ? "border-amber-300/50 bg-amber-50 text-amber-800"
        : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink-muted)]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.2em] ${tone}`}
    >
      {label}
    </span>
  );
}

/* ─── Primary button ─── */

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = "blue",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "blue" | "dark" | "emerald";
  className?: string;
}) {
  const base =
    variant === "emerald"
      ? "bg-[var(--accent-emerald)] text-white"
      : variant === "dark"
        ? "bg-[var(--ink-strong)] text-white"
        : "bg-[var(--accent-blue)] text-white";

  return (
    <button
      className={`w-full rounded-xl px-5 py-4 text-[0.88rem] font-medium transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:hover:brightness-100 ${base} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* ─── Secondary button ─── */

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`w-full rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3.5 text-[0.82rem] font-medium text-[var(--ink-strong)] transition hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* ─── Empty state ─── */

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)]/60 px-5 py-8 text-center text-[0.82rem] leading-7 text-[var(--ink-muted)]">
      {text}
    </div>
  );
}

/* ─── Section label ─── */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[var(--ink-muted)]">
      {children}
    </p>
  );
}

/* ─── List block ─── */

export function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-3 space-y-2 text-[0.82rem] leading-7 text-[var(--ink-soft)]">
        {items.map((item, i) => (
          <li key={`${title}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Navigation footer ─── */

export function StepNav({
  back,
  next,
  nextLabel = "Continue",
  nextDisabled = false,
  onNext,
}: {
  back?: { href: string; label: string };
  next?: { href: string };
  nextLabel?: string;
  nextDisabled?: boolean;
  onNext?: () => void;
}) {
  return (
    <div className="mt-12 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
      {back ? (
        <Link
          href={back.href}
          className="text-[0.82rem] font-medium text-[var(--ink-soft)] transition hover:text-[var(--ink-strong)]"
        >
          &larr; {back.label}
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        nextDisabled ? (
          <span className="cursor-not-allowed rounded-xl bg-zinc-200 px-6 py-3 text-[0.82rem] font-medium text-zinc-400">
            {nextLabel} &rarr;
          </span>
        ) : (
          <Link
            href={next.href}
            onClick={() => onNext?.()}
            className="rounded-xl bg-[var(--ink-strong)] px-6 py-3 text-[0.82rem] font-medium text-white transition hover:brightness-110"
          >
            {nextLabel} &rarr;
          </Link>
        )
      ) : null}
    </div>
  );
}
