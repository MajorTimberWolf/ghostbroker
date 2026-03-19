"use client";

import type {
  GetGrantedExecutionPermissionsResult,
  GetSupportedExecutionPermissionsResult,
} from "@metamask/smart-accounts-kit/actions";
import type { Address } from "viem";
import { useEffect, useState } from "react";

import {
  buildDelegationPlan,
  buildSettlementPlan,
  defaultTask,
  taskFingerprint,
  type BrokerEvaluationResponse,
  type CandidateEvaluation,
  type Confidentiality,
  type DelegationPlan,
  type EvaluationProvider,
  type Receipt,
  type ReceiptProvider,
  type ReceiptUploadResponse,
  type SettlementPlan,
  type SettlementProvider,
  type SettlementQuoteResponse,
  type TaskForm,
  type Urgency,
} from "@/lib/ghostbroker";
import {
  buildGhostBrokerPermissionRequest,
  connectMetaMask,
  formatAddress,
  getMetaMaskProvider,
  getPermissionBlueprint,
  isBlueprintSupported,
  loadMetaMaskExecutionPermissions,
  readMetaMaskSession,
  requestGhostBrokerExecutionPermission,
} from "@/lib/metamask";

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
  settlementProviderUsed: SettlementProvider | null;
  receiptProviderUsed: ReceiptProvider | null;
  isLoading: boolean;
  error: string | null;
  approvalPending: boolean;
  approvalError: string | null;
  approvalMode: "wallet-granted" | "simulated" | null;
  grantedPermission: GrantedPermissionPreview | null;
  settlementPending: boolean;
  settlementError: string | null;
  settlementDiagnostics: string[];
  receiptPending: boolean;
  receiptError: string | null;
  receiptDiagnostics: string[];
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
  settlementProviderUsed: null,
  receiptProviderUsed: null,
  isLoading: false,
  error: null,
  approvalPending: false,
  approvalError: null,
  approvalMode: null,
  grantedPermission: null,
  settlementPending: false,
  settlementError: null,
  settlementDiagnostics: [],
  receiptPending: false,
  receiptError: null,
  receiptDiagnostics: [],
};

type WalletState = {
  isAvailable: boolean;
  isMetaMask: boolean;
  isHydrating: boolean;
  isConnecting: boolean;
  account: Address | null;
  chainId: number | null;
  supportedPermissions: GetSupportedExecutionPermissionsResult | null;
  grantedPermissions: GetGrantedExecutionPermissionsResult;
  capabilityError: string | null;
};

type GrantedPermissionPreview = {
  permissionType: string;
  context: Address | null;
  delegationManager: Address | null;
  to: Address | null;
};

const initialWalletState: WalletState = {
  isAvailable: false,
  isMetaMask: false,
  isHydrating: true,
  isConnecting: false,
  account: null,
  chainId: null,
  supportedPermissions: null,
  grantedPermissions: [],
  capabilityError: null,
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

function receiptTone(providerUsed: ReceiptProvider | null) {
  if (providerUsed === "filecoin") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  return "border-amber-300 bg-amber-50 text-amber-900";
}

function approvalTone(approvalMode: RunState["approvalMode"]) {
  if (approvalMode === "wallet-granted") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  return "border-amber-300 bg-amber-50 text-amber-900";
}

function normalizeGrantedPermission(
  grant: GetGrantedExecutionPermissionsResult[number],
): GrantedPermissionPreview {
  return {
    permissionType: grant.permission.type,
    context: grant.context,
    delegationManager: grant.delegationManager,
    to: grant.to,
  };
}

async function loadExecutionPermissionsWithRetry() {
  try {
    return await loadMetaMaskExecutionPermissions();
  } catch (error) {
    const message = toErrorMessage(error);

    if (!message.includes("already being processed")) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      return await loadMetaMaskExecutionPermissions();
    } catch (retryError) {
      if (toErrorMessage(retryError).includes("already being processed")) {
        return null;
      }

      throw retryError;
    }
  }
}

export function GhostBrokerConsole() {
  const [task, setTask] = useState<TaskForm>(defaultTask);
  const [run, setRun] = useState<RunState>(initialRunState);
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);

  useEffect(() => {
    let isActive = true;
    const provider = getMetaMaskProvider();

    async function hydrateWallet() {
      const currentProvider = provider ?? getMetaMaskProvider();

      if (!currentProvider) {
        if (!isActive) return;
        setWallet({
          ...initialWalletState,
          isHydrating: false,
        });
        return;
      }

      try {
        const session = await readMetaMaskSession();
        let supportedPermissions: GetSupportedExecutionPermissionsResult | null = null;
        let grantedPermissions: GetGrantedExecutionPermissionsResult = [];
        let capabilityError: string | null = null;

        try {
          const permissions = await loadExecutionPermissionsWithRetry();
          if (permissions) {
            supportedPermissions = permissions.supportedPermissions;
            grantedPermissions = permissions.grantedPermissions;
          }
        } catch (error) {
          capabilityError = toErrorMessage(error);
        }

        if (!isActive) return;

        setWallet({
          isAvailable: true,
          isMetaMask: Boolean(currentProvider.isMetaMask),
          isHydrating: false,
          isConnecting: false,
          account: session.account,
          chainId: session.chainId,
          supportedPermissions,
          grantedPermissions,
          capabilityError,
        });
      } catch (error) {
        if (!isActive) return;

        setWallet({
          isAvailable: true,
          isMetaMask: Boolean(currentProvider.isMetaMask),
          isHydrating: false,
          isConnecting: false,
          account: null,
          chainId: null,
          supportedPermissions: null,
          grantedPermissions: [],
          capabilityError: toErrorMessage(error),
        });
      }
    }

    void hydrateWallet();

    if (!provider?.on || !provider.removeListener) {
      return () => {
        isActive = false;
      };
    }

    const handleAccountsChanged = () => {
      void hydrateWallet();
    };

    const handleChainChanged = () => {
      void hydrateWallet();
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      isActive = false;
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

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
      settlementProviderUsed: null,
      receiptProviderUsed: null,
      isLoading: false,
      error: null,
      approvalPending: false,
      approvalError: null,
      approvalMode: null,
      grantedPermission: null,
      settlementPending: false,
      settlementError: null,
      settlementDiagnostics: [],
      receiptPending: false,
      receiptError: null,
      receiptDiagnostics: [],
    });
  }

  function handleSelect(candidate: CandidateEvaluation) {
    if (!run.taskSnapshot) return;

    const taskSnapshot = run.taskSnapshot;

    setRun((current) => ({
      ...current,
      selected: candidate,
      delegation: buildDelegationPlan(taskSnapshot, candidate, wallet.chainId),
      settlement: buildSettlementPlan(taskSnapshot, candidate),
      receipt: null,
      approved: false,
      settled: false,
      settlementProviderUsed: null,
      receiptProviderUsed: null,
      approvalPending: false,
      approvalError: null,
      approvalMode: null,
      grantedPermission: null,
      settlementPending: true,
      settlementError: null,
      settlementDiagnostics: [],
      receiptPending: false,
      receiptError: null,
      receiptDiagnostics: [],
    }));
  }

  useEffect(() => {
    if (!run.selected || !run.taskSnapshot || !run.evaluationId) {
      return;
    }

    let isActive = true;
    const selectedAgentId = run.selected.agent.id;

    async function refreshSettlementQuote() {
      setRun((current) => ({
        ...current,
        settlementPending: true,
        settlementError: null,
      }));

      try {
        const response = await fetch("/api/broker/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evaluationId: run.evaluationId,
            agentId: selectedAgentId,
            chainId: wallet.chainId,
            swapper: wallet.account,
          }),
        });

        if (!response.ok) {
          const errorPayload = (await response.json()) as { error?: string };

          if (!isActive) return;

          setRun((current) => ({
            ...current,
            settlementPending: false,
            settlementError:
              errorPayload.error ?? "Uniswap quote refresh failed unexpectedly.",
          }));
          return;
        }

        const payload = (await response.json()) as SettlementQuoteResponse;

        if (!isActive) return;

        setRun((current) => {
          if (current.selected?.agent.id !== selectedAgentId) {
            return current;
          }

          return {
            ...current,
            settlement: payload.settlementPlan,
            settlementProviderUsed: payload.providerUsed,
            settlementPending: false,
            settlementError: null,
            settlementDiagnostics: payload.diagnostics,
          };
        });
      } catch (error) {
        if (!isActive) return;

        setRun((current) => ({
          ...current,
          settlementPending: false,
          settlementError: toErrorMessage(error),
        }));
      }
    }

    void refreshSettlementQuote();

    return () => {
      isActive = false;
    };
  }, [run.selected, run.taskSnapshot, run.evaluationId, wallet.account, wallet.chainId]);

  useEffect(() => {
    if (!run.selected || !run.taskSnapshot) {
      return;
    }

    setRun((current) => {
      if (!current.selected || !current.taskSnapshot) {
        return current;
      }

      return {
        ...current,
        delegation: buildDelegationPlan(
          current.taskSnapshot,
          current.selected,
          wallet.chainId,
        ),
      };
    });
  }, [wallet.chainId, run.selected, run.taskSnapshot]);

  async function handleConnectWallet() {
    setWallet((current) => ({
      ...current,
      isConnecting: true,
      capabilityError: null,
    }));

    try {
      const session = await connectMetaMask();
      let supportedPermissions: GetSupportedExecutionPermissionsResult | null = null;
      let grantedPermissions: GetGrantedExecutionPermissionsResult = [];
      let capabilityError: string | null = null;

      try {
        const permissions = await loadExecutionPermissionsWithRetry();
        if (permissions) {
          supportedPermissions = permissions.supportedPermissions;
          grantedPermissions = permissions.grantedPermissions;
        }
      } catch (error) {
        capabilityError = toErrorMessage(error);
      }

      setWallet({
        isAvailable: true,
        isMetaMask: Boolean(getMetaMaskProvider()?.isMetaMask),
        isHydrating: false,
        isConnecting: false,
        account: session.account,
        chainId: session.chainId,
        supportedPermissions,
        grantedPermissions,
        capabilityError,
      });
    } catch (error) {
      setWallet((current) => ({
        ...current,
        isConnecting: false,
        capabilityError: toErrorMessage(error),
      }));
    }
  }

  async function handleApprove() {
    if (!run.delegation || !run.taskSnapshot) return;

    if (!wallet.account) {
      await handleConnectWallet();
      return;
    }

    const blueprint = getPermissionBlueprint(run.taskSnapshot.payoutToken, wallet.chainId);
    const supportState = isBlueprintSupported({
      blueprint,
      supportedPermissions: wallet.supportedPermissions,
    });

    if (!supportState.isTypeSupported || !supportState.isChainSupported) {
      setRun((current) => ({
        ...current,
        approvalError:
          "MetaMask does not currently report support for this execution permission on the required chain.",
      }));
      return;
    }

    setRun((current) => ({
      ...current,
      approvalPending: true,
      approvalError: null,
    }));

    try {
      const permissionResult = await requestGhostBrokerExecutionPermission({
        account: wallet.account,
        task: run.taskSnapshot,
        delegation: run.delegation,
        walletChainId: wallet.chainId,
      });
      const permissions = await loadExecutionPermissionsWithRetry();

      setWallet((current) => ({
        ...current,
        grantedPermissions: permissions?.grantedPermissions ?? current.grantedPermissions,
        supportedPermissions: permissions?.supportedPermissions ?? current.supportedPermissions,
      }));

      setRun((current) => ({
        ...current,
        approved: Boolean(permissionResult.latestGrant),
        approvalPending: false,
        approvalError: permissionResult.latestGrant
          ? null
          : "MetaMask returned no execution permission context.",
        approvalMode: permissionResult.latestGrant ? "wallet-granted" : null,
        grantedPermission: permissionResult.latestGrant
          ? normalizeGrantedPermission(permissionResult.latestGrant)
          : null,
      }));
    } catch (error) {
      setRun((current) => ({
        ...current,
        approvalPending: false,
        approvalError: toErrorMessage(error),
      }));
    }
  }

  function handleSimulateApproval() {
    if (!run.delegation || !requestedPermission) return;

    setRun((current) => ({
      ...current,
      approved: true,
      approvalError: null,
      approvalMode: "simulated",
      grantedPermission: {
        permissionType: requestedPermission.permission.type,
        context: wallet.account,
        delegationManager: null,
        to: run.delegation!.delegateAddress,
      },
    }));
  }

  async function handleSettle() {
    if (!run.selected || !run.settlement || !run.taskSnapshot || !run.evaluationId) return;

    const selectedAgentId = run.selected.agent.id;
    const settlementPlan = run.settlement;
    const evaluationId = run.evaluationId;

    setRun((current) => ({
      ...current,
      receiptPending: true,
      receiptError: null,
      receiptDiagnostics: [],
    }));

    try {
      const response = await fetch("/api/broker/receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evaluationId,
          agentId: selectedAgentId,
          settlementPlan,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };

        setRun((current) => ({
          ...current,
          receiptPending: false,
          receiptError:
            errorPayload.error ?? "Receipt bundle creation failed unexpectedly.",
        }));
        return;
      }

      const payload = (await response.json()) as ReceiptUploadResponse;

      setRun((current) => {
        if (current.selected?.agent.id !== selectedAgentId) {
          return current;
        }

        return {
          ...current,
          settled: true,
          receipt: payload.receipt,
          receiptProviderUsed: payload.providerUsed,
          receiptPending: false,
          receiptError: null,
          receiptDiagnostics: payload.diagnostics,
        };
      });
    } catch (error) {
      setRun((current) => ({
        ...current,
        receiptPending: false,
        receiptError: toErrorMessage(error),
      }));
    }
  }

  function handleReset() {
    setTask(defaultTask);
    setRun(initialRunState);
  }

  const hasTaskDrift =
    run.taskSnapshot !== null &&
    taskFingerprint(task) !== taskFingerprint(run.taskSnapshot);
  const requestedPermission =
    run.delegation && run.taskSnapshot
      ? buildGhostBrokerPermissionRequest({
          account:
            wallet.account ??
            "0x0000000000000000000000000000000000000000",
          task: run.taskSnapshot,
          delegation: run.delegation,
          walletChainId: wallet.chainId,
        })
      : null;
  const permissionBlueprint = run.taskSnapshot
    ? getPermissionBlueprint(run.taskSnapshot.payoutToken, wallet.chainId)
    : null;
  const permissionSupport =
    permissionBlueprint === null
      ? null
      : isBlueprintSupported({
          blueprint: permissionBlueprint,
          supportedPermissions: wallet.supportedPermissions,
        });
  const canRequestPermission =
    Boolean(run.delegation && run.taskSnapshot && wallet.account) &&
    Boolean(permissionSupport?.isTypeSupported && permissionSupport.isChainSupported);
  const capabilityMessage =
    wallet.capabilityError &&
    !wallet.capabilityError.includes("already being processed")
      ? wallet.capabilityError
      : null;
  const unsupportedPermissionMessage =
    wallet.account &&
    permissionBlueprint &&
    (capabilityMessage ||
      (permissionSupport !== null &&
        (!permissionSupport.isTypeSupported || !permissionSupport.isChainSupported)))
      ? "This wallet version does not expose ERC-7715 execution permission RPCs on the required chain yet. The request payload below is real, but this session needs a clearly labeled simulated approval to keep the demo moving."
      : null;
  const canSimulateApproval =
    Boolean(wallet.isAvailable && wallet.account && run.delegation && requestedPermission) &&
    Boolean(unsupportedPermissionMessage) &&
    !run.approved;
  const receiptProviderUsed = run.receiptProviderUsed ?? null;
  const receiptPending = run.receiptPending ?? false;
  const receiptError = run.receiptError ?? null;
  const receiptDiagnostics = run.receiptDiagnostics ?? [];

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
                MetaMask execution permission
              </h2>
              {!run.delegation ? (
                <div className="mt-5">
                  <EmptyState text="Pick a provider to generate the bounded delegation scope." />
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-[var(--border-strong)] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(247,242,235,0.92))] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        {wallet.isHydrating
                          ? "Scanning wallet"
                          : wallet.isMetaMask
                            ? "MetaMask detected"
                            : "Wallet check"}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        {wallet.account ? formatAddress(wallet.account) : "No wallet connected"}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        {wallet.chainId ? `Wallet chain ${wallet.chainId}` : "Wallet chain unknown"}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        {permissionBlueprint
                          ? `${permissionBlueprint.chainName} ${permissionBlueprint.chainId}`
                          : "Chain pending"}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        {wallet.grantedPermissions.length} grants cached
                      </span>
                    </div>

                    {!wallet.isAvailable ? (
                      <p className="text-sm leading-7 text-[var(--ink-soft)]">
                        MetaMask is not available in this browser. Open the app in a
                        MetaMask-enabled browser to request a real ERC-7715 execution
                        permission.
                      </p>
                    ) : (
                      <div className="grid gap-3 text-sm leading-7 text-[var(--ink-soft)]">
                        <p>
                          This step now requests a real wallet permission instead of
                          flipping a demo boolean. GhostBroker asks MetaMask for a
                          bounded execution scope tied to the frozen task snapshot.
                        </p>
                        {capabilityMessage ? (
                          <div className="rounded-[1.2rem] border border-[var(--accent-gold)] bg-[rgba(240,195,107,0.12)] px-4 py-3">
                            {capabilityMessage}
                          </div>
                        ) : null}
                        {unsupportedPermissionMessage ? (
                          <div className="rounded-[1.2rem] border border-[var(--accent-gold)] bg-[linear-gradient(145deg,rgba(255,246,224,0.86),rgba(255,238,212,0.94))] px-4 py-3 text-[var(--ink-strong)] shadow-[0_10px_24px_rgba(92,61,22,0.08)]">
                            <p className="font-medium tracking-[-0.01em]">
                              Wallet-granted execution permission is not available in
                              this MetaMask build.
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                              {unsupportedPermissionMessage}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

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
                      label="Delegate wallet"
                      value={formatAddress(run.delegation.delegateAddress)}
                    />
                    <KeyValue
                      label="Spend cap"
                      value={`${run.delegation.spendCap} ${run.taskSnapshot?.payoutToken ?? task.payoutToken}`}
                    />
                    <KeyValue
                      label="Chain"
                      value={`${permissionBlueprint?.chainName ?? run.delegation.chain} · ${permissionBlueprint?.chainId ?? run.delegation.chainId}`}
                    />
                    <KeyValue
                      label="Expiry"
                      value={`${run.delegation.expiryHours} hours`}
                    />
                  </div>

                  {requestedPermission ? (
                    <div className="mt-4 rounded-[1.5rem] border border-[var(--border)] bg-white p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                        Requested permission
                      </p>
                      <div className="mt-3 grid gap-3 text-sm">
                        <KeyValue
                          label="Permission type"
                          value={requestedPermission.permission.type}
                        />
                        <KeyValue
                          label="Delegator"
                          value={formatAddress(wallet.account)}
                        />
                        <KeyValue
                          label="Adjustment"
                          value={
                            requestedPermission.isAdjustmentAllowed
                              ? "Adjustable"
                              : "Fixed bounds"
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {permissionBlueprint ? (
                    <div className="mt-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
                      <p>
                        Required wallet capability:
                        <span className="ml-2 font-medium text-[var(--ink-strong)]">
                          {permissionBlueprint.permissionType}
                        </span>
                      </p>
                      <p className="mt-2">
                        Support status:{" "}
                        {permissionSupport?.isTypeSupported
                          ? permissionSupport.isChainSupported
                            ? "available on required chain"
                            : "type available, chain not reported"
                          : "not reported by wallet"}
                      </p>
                    </div>
                  ) : null}

                  <ListBlock
                    title="Allowed actions"
                    items={run.delegation.permissions}
                  />
                  <ListBlock title="Guardrails" items={run.delegation.guardrails} />

                  <button
                    className={`mt-5 w-full rounded-[1.25rem] px-5 py-4 font-medium transition ${
                      run.approved
                        ? "bg-emerald-600 text-white"
                        : !wallet.isAvailable
                          ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                          : wallet.account && !canRequestPermission
                          ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                          : "bg-[var(--ink-strong)] text-white hover:brightness-110"
                    }`}
                    disabled={
                      run.approved ||
                      run.approvalPending ||
                      !wallet.isAvailable ||
                      (Boolean(wallet.account) && !canRequestPermission)
                    }
                    onClick={handleApprove}
                    type="button"
                  >
                    {run.approvalPending
                      ? "Requesting MetaMask permission…"
                      : run.approved
                        ? run.approvalMode === "simulated"
                          ? "Bounded approval simulated"
                          : "Execution permission granted"
                        : wallet.account
                          ? "Request bounded execution permission"
                          : "Connect MetaMask to approve"}
                  </button>

                  {run.approvalError ? (
                    <p className="mt-3 text-sm text-rose-700">{run.approvalError}</p>
                  ) : null}

                  {canSimulateApproval ? (
                    <button
                      className="mt-3 w-full rounded-[1.1rem] border border-[var(--accent-gold)] bg-[rgba(255,246,224,0.92)] px-4 py-3 text-sm font-medium text-[var(--ink-strong)] transition hover:brightness-95"
                      onClick={handleSimulateApproval}
                      type="button"
                    >
                      Simulate bounded approval for demo
                    </button>
                  ) : null}

                  {wallet.isAvailable && !wallet.account ? (
                    <button
                      className="mt-3 w-full rounded-[1.1rem] border border-[var(--border-strong)] bg-white px-4 py-3 text-sm font-medium transition hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
                      disabled={wallet.isConnecting}
                      onClick={handleConnectWallet}
                      type="button"
                    >
                      {wallet.isConnecting ? "Connecting MetaMask…" : "Connect MetaMask"}
                    </button>
                  ) : null}

                  {run.grantedPermission ? (
                    <div
                      className={`mt-4 rounded-[1.5rem] border p-4 ${
                        run.approvalMode === "simulated"
                          ? "border-amber-300 bg-amber-50/70"
                          : "border-emerald-300 bg-emerald-50/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <p
                          className={`font-mono text-xs uppercase tracking-[0.16em] ${
                            run.approvalMode === "simulated"
                              ? "text-amber-900"
                              : "text-emerald-800"
                          }`}
                        >
                          Granted context
                        </p>
                        <span
                          className={`rounded-full border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] ${approvalTone(run.approvalMode)}`}
                        >
                          {run.approvalMode === "simulated"
                            ? "delegation simulated"
                            : "delegation wallet-granted"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm">
                        <KeyValue
                          label="Permission type"
                          value={run.grantedPermission.permissionType}
                        />
                        <KeyValue
                          label="Context"
                          value={formatAddress(run.grantedPermission.context)}
                        />
                        <KeyValue
                          label="Delegation manager"
                          value={formatAddress(run.grantedPermission.delegationManager)}
                        />
                        <KeyValue
                          label="Granted for"
                          value={formatAddress(run.grantedPermission.to)}
                        />
                      </div>
                    </div>
                  ) : null}
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
                  {run.settlementProviderUsed ? (
                    <div
                      className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] ${
                        run.settlementProviderUsed === "uniswap"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-amber-300 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <span>Quote provider</span>
                      <span>{run.settlementProviderUsed}</span>
                    </div>
                  ) : null}

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
                    {run.settlement.requestId ? (
                      <KeyValue label="Request ID" value={run.settlement.requestId} />
                    ) : null}
                    {run.settlement.routing ? (
                      <KeyValue label="Routing" value={run.settlement.routing} />
                    ) : null}
                    {run.settlement.gasEstimateUSD ? (
                      <KeyValue
                        label="Est. gas"
                        value={`$${run.settlement.gasEstimateUSD}`}
                      />
                    ) : null}
                  </div>

                  {run.settlementDiagnostics.length > 0 ? (
                    <div className="mt-4 rounded-[1.5rem] border border-[var(--border)] bg-white p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                        Quote diagnostics
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink-soft)]">
                        {run.settlementDiagnostics.map((message, index) => (
                          <li key={`settlement-diagnostic-${index}`}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {run.settlementError ? (
                    <p className="mt-4 text-sm text-rose-700">{run.settlementError}</p>
                  ) : null}

                  {run.settlementPending ? (
                    <p className="mt-4 text-sm text-[var(--ink-soft)]">
                      Refreshing the settlement path with the current wallet and
                      route assumptions…
                    </p>
                  ) : null}

                  <button
                    className={`mt-5 w-full rounded-[1.25rem] px-5 py-4 font-medium transition ${
                      !run.approved
                        ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                        : run.settled
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--accent-blue)] text-white hover:brightness-110"
                    }`}
                    disabled={!run.approved || run.settled || receiptPending}
                    onClick={() => {
                      void handleSettle();
                    }}
                    type="button"
                  >
                    {receiptPending
                      ? "Writing receipt bundle…"
                      : run.settled
                      ? "Settlement executed"
                      : run.settlementPending
                        ? "Waiting for settlement quote…"
                        : "Execute bounded settlement"}
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
                <EmptyState
                  text={
                    receiptPending
                      ? "Receipt bundle is being pinned to storage."
                      : "Receipt bundle is emitted after settlement completes."
                  }
                />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] ${receiptTone(receiptProviderUsed)}`}
                >
                  <span>
                    {receiptProviderUsed === "filecoin"
                      ? "filecoin receipt"
                      : "local receipt"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
              </div>
            )}

            {receiptError ? (
              <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {receiptError}
              </div>
            ) : null}

            {receiptDiagnostics.length > 0 ? (
              <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(255,250,244,0.78)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  Receipt diagnostics
                </p>
                <ul className="mt-3 space-y-2">
                  {receiptDiagnostics.map((item, index) => (
                    <li key={`receipt-diagnostic-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The wallet request failed.";
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
