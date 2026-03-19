"use client";

import type {
  GetGrantedExecutionPermissionsResult,
  GetSupportedExecutionPermissionsResult,
} from "@metamask/smart-accounts-kit/actions";
import type { Address } from "viem";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  buildDelegationPlan,
  buildSettlementPlan,
  defaultTask,
  taskFingerprint,
  type BrokerEvaluationResponse,
  type CandidateEvaluation,
  type DelegationPlan,
  type EvaluationProvider,
  type Receipt,
  type ReceiptProvider,
  type ReceiptUploadResponse,
  type SettlementPlan,
  type SettlementProvider,
  type SettlementQuoteResponse,
  type TaskForm,
} from "@/lib/ghostbroker";
import {
  buildGhostBrokerPermissionRequest,
  connectMetaMask,
  getMetaMaskProvider,
  getPermissionBlueprint,
  isBlueprintSupported,
  loadMetaMaskExecutionPermissions,
  readMetaMaskSession,
  requestGhostBrokerExecutionPermission,
} from "@/lib/metamask";

/* ─── Wallet ─── */

export type WalletState = {
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

/* ─── Granted Permission ─── */

export type GrantedPermissionPreview = {
  permissionType: string;
  context: Address | null;
  delegationManager: Address | null;
  to: Address | null;
};

/* ─── Workflow ─── */

export type WorkflowStep = "intake" | "evaluate" | "delegate" | "settle";

export type BrokerState = {
  task: TaskForm;
  memo: string[];
  candidates: CandidateEvaluation[];
  selected: CandidateEvaluation | null;
  delegation: DelegationPlan | null;
  settlement: SettlementPlan | null;
  receipt: Receipt | null;
  evaluationId: string | null;
  taskSnapshot: TaskForm | null;
  providerUsed: EvaluationProvider | null;
  settlementProviderUsed: SettlementProvider | null;
  receiptProviderUsed: ReceiptProvider | null;
  approved: boolean;
  settled: boolean;
  approvalMode: "wallet-granted" | "simulated" | null;
  grantedPermission: GrantedPermissionPreview | null;
  isLoading: boolean;
  error: string | null;
  approvalPending: boolean;
  approvalError: string | null;
  settlementPending: boolean;
  settlementError: string | null;
  settlementDiagnostics: string[];
  receiptPending: boolean;
  receiptError: string | null;
  receiptDiagnostics: string[];
};

const initialBrokerState: BrokerState = {
  task: defaultTask,
  memo: [],
  candidates: [],
  selected: null,
  delegation: null,
  settlement: null,
  receipt: null,
  evaluationId: null,
  taskSnapshot: null,
  providerUsed: null,
  settlementProviderUsed: null,
  receiptProviderUsed: null,
  approved: false,
  settled: false,
  approvalMode: null,
  grantedPermission: null,
  isLoading: false,
  error: null,
  approvalPending: false,
  approvalError: null,
  settlementPending: false,
  settlementError: null,
  settlementDiagnostics: [],
  receiptPending: false,
  receiptError: null,
  receiptDiagnostics: [],
};

/* ─── Context shape ─── */

type BrokerContextValue = {
  broker: BrokerState;
  wallet: WalletState;
  currentStep: WorkflowStep;
  completedSteps: Set<WorkflowStep>;
  hasTaskDrift: boolean;

  updateTask: <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => void;
  runEvaluation: () => Promise<void>;
  selectProvider: (candidate: CandidateEvaluation) => void;
  connectWallet: () => Promise<void>;
  requestApproval: () => Promise<void>;
  simulateApproval: () => void;
  executeSettlement: () => Promise<void>;
  reset: () => void;

  canRequestPermission: boolean;
  canSimulateApproval: boolean;
  unsupportedPermissionMessage: string | null;
  requestedPermission: ReturnType<typeof buildGhostBrokerPermissionRequest> | null;
  permissionBlueprint: ReturnType<typeof getPermissionBlueprint> | null;
  permissionSupport: ReturnType<typeof isBlueprintSupported> | null;
};

const BrokerContext = createContext<BrokerContextValue | null>(null);

export function useBroker() {
  const ctx = useContext(BrokerContext);
  if (!ctx) throw new Error("useBroker must be used within BrokerProvider");
  return ctx;
}

/* ─── Helpers ─── */

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
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
    if (!message.includes("already being processed")) throw error;
    await new Promise((r) => setTimeout(r, 1500));
    try {
      return await loadMetaMaskExecutionPermissions();
    } catch (retryError) {
      if (toErrorMessage(retryError).includes("already being processed")) return null;
      throw retryError;
    }
  }
}

/* ─── Provider ─── */

export function BrokerProvider({ children }: { children: ReactNode }) {
  const [broker, setBroker] = useState<BrokerState>(initialBrokerState);
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);

  /* ── Wallet hydration ── */
  useEffect(() => {
    let isActive = true;
    const provider = getMetaMaskProvider();

    async function hydrateWallet() {
      const p = provider ?? getMetaMaskProvider();
      if (!p) {
        if (isActive) setWallet({ ...initialWalletState, isHydrating: false });
        return;
      }
      try {
        const session = await readMetaMaskSession();
        let supported: GetSupportedExecutionPermissionsResult | null = null;
        let granted: GetGrantedExecutionPermissionsResult = [];
        let capErr: string | null = null;
        try {
          const perms = await loadExecutionPermissionsWithRetry();
          if (perms) {
            supported = perms.supportedPermissions;
            granted = perms.grantedPermissions;
          }
        } catch (e) {
          capErr = toErrorMessage(e);
        }
        if (!isActive) return;
        setWallet({
          isAvailable: true,
          isMetaMask: Boolean(p.isMetaMask),
          isHydrating: false,
          isConnecting: false,
          account: session.account,
          chainId: session.chainId,
          supportedPermissions: supported,
          grantedPermissions: granted,
          capabilityError: capErr,
        });
      } catch (e) {
        if (!isActive) return;
        setWallet({
          isAvailable: true,
          isMetaMask: Boolean(p.isMetaMask),
          isHydrating: false,
          isConnecting: false,
          account: null,
          chainId: null,
          supportedPermissions: null,
          grantedPermissions: [],
          capabilityError: toErrorMessage(e),
        });
      }
    }

    void hydrateWallet();

    if (provider?.on && provider.removeListener) {
      const onChanged = () => void hydrateWallet();
      provider.on("accountsChanged", onChanged);
      provider.on("chainChanged", onChanged);
      return () => {
        isActive = false;
        provider.removeListener?.("accountsChanged", onChanged);
        provider.removeListener?.("chainChanged", onChanged);
      };
    }
    return () => { isActive = false; };
  }, []);

  /* ── Recompute delegation when chain changes ── */
  useEffect(() => {
    if (!broker.selected || !broker.taskSnapshot) return;
    setBroker((s) => ({
      ...s,
      delegation: s.selected && s.taskSnapshot
        ? buildDelegationPlan(s.taskSnapshot, s.selected, wallet.chainId)
        : s.delegation,
    }));
  }, [wallet.chainId, broker.selected, broker.taskSnapshot]);

  /* ── Settlement quote refresh ── */
  useEffect(() => {
    if (!broker.selected || !broker.taskSnapshot || !broker.evaluationId) return;
    let isActive = true;
    const agentId = broker.selected.agent.id;

    async function refreshQuote() {
      setBroker((s) => ({ ...s, settlementPending: true, settlementError: null }));
      try {
        const res = await fetch("/api/broker/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evaluationId: broker.evaluationId,
            agentId,
            chainId: wallet.chainId,
            swapper: wallet.account,
          }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          if (isActive)
            setBroker((s) => ({
              ...s,
              settlementPending: false,
              settlementError: err.error ?? "Quote failed.",
            }));
          return;
        }
        const payload = (await res.json()) as SettlementQuoteResponse;
        if (!isActive) return;
        setBroker((s) =>
          s.selected?.agent.id !== agentId
            ? s
            : {
                ...s,
                settlement: payload.settlementPlan,
                settlementProviderUsed: payload.providerUsed,
                settlementPending: false,
                settlementDiagnostics: payload.diagnostics,
              },
        );
      } catch (e) {
        if (isActive)
          setBroker((s) => ({
            ...s,
            settlementPending: false,
            settlementError: toErrorMessage(e),
          }));
      }
    }
    void refreshQuote();
    return () => { isActive = false; };
  }, [broker.selected, broker.taskSnapshot, broker.evaluationId, wallet.account, wallet.chainId]);

  /* ── Actions ── */

  const updateTask = useCallback(
    <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => {
      setBroker((s) => ({ ...s, task: { ...s.task, [key]: value } }));
    },
    [],
  );

  const runEvaluation = useCallback(async () => {
    setBroker((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await fetch("/api/broker/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broker.task),
      });
      if (!res.ok) {
        setBroker((s) => ({ ...s, isLoading: false, error: "Evaluation failed." }));
        return;
      }
      const payload = (await res.json()) as BrokerEvaluationResponse;
      setBroker((s) => ({
        ...s,
        memo: payload.memo,
        candidates: payload.candidates,
        evaluationId: payload.evaluationId,
        taskSnapshot: payload.taskSnapshot,
        providerUsed: payload.providerUsed,
        selected: null,
        delegation: null,
        settlement: null,
        receipt: null,
        approved: false,
        settled: false,
        approvalMode: null,
        grantedPermission: null,
        settlementProviderUsed: null,
        receiptProviderUsed: null,
        isLoading: false,
        error: null,
        approvalPending: false,
        approvalError: null,
        settlementPending: false,
        settlementError: null,
        settlementDiagnostics: [],
        receiptPending: false,
        receiptError: null,
        receiptDiagnostics: [],
      }));
    } catch {
      setBroker((s) => ({ ...s, isLoading: false, error: "Network error." }));
    }
  }, [broker.task]);

  const selectProvider = useCallback(
    (candidate: CandidateEvaluation) => {
      if (!broker.taskSnapshot) return;
      setBroker((s) => ({
        ...s,
        selected: candidate,
        delegation: buildDelegationPlan(s.taskSnapshot!, candidate, wallet.chainId),
        settlement: buildSettlementPlan(s.taskSnapshot!, candidate),
        receipt: null,
        approved: false,
        settled: false,
        approvalMode: null,
        grantedPermission: null,
        settlementProviderUsed: null,
        receiptProviderUsed: null,
        approvalPending: false,
        approvalError: null,
        settlementPending: true,
        settlementError: null,
        settlementDiagnostics: [],
        receiptPending: false,
        receiptError: null,
        receiptDiagnostics: [],
      }));
    },
    [broker.taskSnapshot, wallet.chainId],
  );

  const connectWallet = useCallback(async () => {
    setWallet((s) => ({ ...s, isConnecting: true, capabilityError: null }));
    try {
      const session = await connectMetaMask();
      let supported: GetSupportedExecutionPermissionsResult | null = null;
      let granted: GetGrantedExecutionPermissionsResult = [];
      let capErr: string | null = null;
      try {
        const perms = await loadExecutionPermissionsWithRetry();
        if (perms) { supported = perms.supportedPermissions; granted = perms.grantedPermissions; }
      } catch (e) { capErr = toErrorMessage(e); }
      setWallet({
        isAvailable: true,
        isMetaMask: Boolean(getMetaMaskProvider()?.isMetaMask),
        isHydrating: false,
        isConnecting: false,
        account: session.account,
        chainId: session.chainId,
        supportedPermissions: supported,
        grantedPermissions: granted,
        capabilityError: capErr,
      });
    } catch (e) {
      setWallet((s) => ({ ...s, isConnecting: false, capabilityError: toErrorMessage(e) }));
    }
  }, []);

  const requestApproval = useCallback(async () => {
    if (!broker.delegation || !broker.taskSnapshot || !wallet.account) return;
    const blueprint = getPermissionBlueprint(broker.taskSnapshot.payoutToken, wallet.chainId);
    const support = isBlueprintSupported({ blueprint, supportedPermissions: wallet.supportedPermissions });
    if (!support.isTypeSupported || !support.isChainSupported) {
      setBroker((s) => ({ ...s, approvalError: "Permission type not supported on this chain." }));
      return;
    }
    setBroker((s) => ({ ...s, approvalPending: true, approvalError: null }));
    try {
      const result = await requestGhostBrokerExecutionPermission({
        account: wallet.account!,
        task: broker.taskSnapshot!,
        delegation: broker.delegation!,
        walletChainId: wallet.chainId,
      });
      const perms = await loadExecutionPermissionsWithRetry();
      setWallet((s) => ({
        ...s,
        grantedPermissions: perms?.grantedPermissions ?? s.grantedPermissions,
        supportedPermissions: perms?.supportedPermissions ?? s.supportedPermissions,
      }));
      setBroker((s) => ({
        ...s,
        approved: Boolean(result.latestGrant),
        approvalPending: false,
        approvalError: result.latestGrant ? null : "No permission context returned.",
        approvalMode: result.latestGrant ? "wallet-granted" : null,
        grantedPermission: result.latestGrant ? normalizeGrantedPermission(result.latestGrant) : null,
      }));
    } catch (e) {
      setBroker((s) => ({ ...s, approvalPending: false, approvalError: toErrorMessage(e) }));
    }
  }, [broker.delegation, broker.taskSnapshot, wallet.account, wallet.chainId, wallet.supportedPermissions]);

  const simulateApproval = useCallback(() => {
    if (!broker.delegation) return;
    const blueprint = getPermissionBlueprint(
      broker.taskSnapshot?.payoutToken ?? broker.task.payoutToken,
      wallet.chainId,
    );
    setBroker((s) => ({
      ...s,
      approved: true,
      approvalError: null,
      approvalMode: "simulated",
      grantedPermission: {
        permissionType: blueprint.permissionType,
        context: wallet.account,
        delegationManager: null,
        to: s.delegation!.delegateAddress,
      },
    }));
  }, [broker.delegation, broker.taskSnapshot, broker.task.payoutToken, wallet.account, wallet.chainId]);

  const executeSettlement = useCallback(async () => {
    if (!broker.selected || !broker.settlement || !broker.evaluationId) return;
    const agentId = broker.selected.agent.id;
    setBroker((s) => ({ ...s, receiptPending: true, receiptError: null, receiptDiagnostics: [] }));
    try {
      const res = await fetch("/api/broker/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId: broker.evaluationId,
          agentId,
          settlementPlan: broker.settlement,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setBroker((s) => ({ ...s, receiptPending: false, receiptError: err.error ?? "Receipt failed." }));
        return;
      }
      const payload = (await res.json()) as ReceiptUploadResponse;
      setBroker((s) =>
        s.selected?.agent.id !== agentId
          ? s
          : {
              ...s,
              settled: true,
              receipt: payload.receipt,
              receiptProviderUsed: payload.providerUsed,
              receiptPending: false,
              receiptDiagnostics: payload.diagnostics,
            },
      );
    } catch (e) {
      setBroker((s) => ({ ...s, receiptPending: false, receiptError: toErrorMessage(e) }));
    }
  }, [broker.selected, broker.settlement, broker.evaluationId]);

  const reset = useCallback(() => {
    setBroker(initialBrokerState);
  }, []);

  /* ── Derived ── */

  const hasTaskDrift =
    broker.taskSnapshot !== null &&
    taskFingerprint(broker.task) !== taskFingerprint(broker.taskSnapshot);

  const currentStep: WorkflowStep = broker.settled
    ? "settle"
    : broker.approved
      ? "settle"
      : broker.selected
        ? "delegate"
        : broker.candidates.length > 0
          ? "evaluate"
          : "intake";

  const completedSteps = useMemo(() => {
    const set = new Set<WorkflowStep>();
    if (broker.candidates.length > 0) set.add("intake");
    if (broker.selected) set.add("evaluate");
    if (broker.approved) set.add("delegate");
    if (broker.settled) set.add("settle");
    return set;
  }, [broker.candidates.length, broker.selected, broker.approved, broker.settled]);

  const permissionBlueprint = broker.taskSnapshot
    ? getPermissionBlueprint(broker.taskSnapshot.payoutToken, wallet.chainId)
    : null;

  const permissionSupport =
    permissionBlueprint === null
      ? null
      : isBlueprintSupported({
          blueprint: permissionBlueprint,
          supportedPermissions: wallet.supportedPermissions,
        });

  const canRequestPermission =
    Boolean(broker.delegation && broker.taskSnapshot && wallet.account) &&
    Boolean(permissionSupport?.isTypeSupported && permissionSupport.isChainSupported);

  const capabilityMessage =
    wallet.capabilityError && !wallet.capabilityError.includes("already being processed")
      ? wallet.capabilityError
      : null;

  const unsupportedPermissionMessage =
    wallet.account &&
    permissionBlueprint &&
    (capabilityMessage ||
      (permissionSupport !== null &&
        (!permissionSupport.isTypeSupported || !permissionSupport.isChainSupported)))
      ? "This wallet supports ERC-7715 execution permissions but does not enable the periodic transfer permission type required for this delegation. The permission request payload is real."
      : null;

  const canSimulateApproval =
    Boolean(wallet.isAvailable && wallet.account && broker.delegation) &&
    Boolean(unsupportedPermissionMessage) &&
    !broker.approved;

  const requestedPermission =
    broker.delegation && broker.taskSnapshot
      ? buildGhostBrokerPermissionRequest({
          account: wallet.account ?? "0x0000000000000000000000000000000000000000",
          task: broker.taskSnapshot,
          delegation: broker.delegation,
          walletChainId: wallet.chainId,
        })
      : null;

  const value = useMemo<BrokerContextValue>(
    () => ({
      broker,
      wallet,
      currentStep,
      completedSteps,
      hasTaskDrift,
      updateTask,
      runEvaluation,
      selectProvider,
      connectWallet,
      requestApproval,
      simulateApproval,
      executeSettlement,
      reset,
      canRequestPermission,
      canSimulateApproval,
      unsupportedPermissionMessage,
      requestedPermission,
      permissionBlueprint,
      permissionSupport,
    }),
    [
      broker,
      wallet,
      currentStep,
      completedSteps,
      hasTaskDrift,
      updateTask,
      runEvaluation,
      selectProvider,
      connectWallet,
      requestApproval,
      simulateApproval,
      executeSettlement,
      reset,
      canRequestPermission,
      canSimulateApproval,
      unsupportedPermissionMessage,
      requestedPermission,
      permissionBlueprint,
      permissionSupport,
    ],
  );

  return <BrokerContext.Provider value={value}>{children}</BrokerContext.Provider>;
}
