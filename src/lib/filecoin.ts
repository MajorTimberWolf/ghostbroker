import lighthouse from "@lighthouse-web3/sdk";

import {
  buildReceipt,
  type CandidateEvaluation,
  type ReceiptUploadResponse,
  type SettlementPlan,
  type TaskForm,
} from "@/lib/ghostbroker";

const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY ?? "";

type StoreReceiptInput = {
  evaluationId: string;
  task: TaskForm;
  candidate: CandidateEvaluation;
  settlement: SettlementPlan;
};

function buildReceiptBundle({
  evaluationId,
  task,
  candidate,
  settlement,
  receiptId,
}: StoreReceiptInput & { receiptId: string }) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    evaluationId,
    receiptId,
    task,
    provider: {
      id: candidate.agent.id,
      name: candidate.agent.name,
      ens: candidate.agent.ens,
      delegateAddress: candidate.agent.delegateAddress,
      score: candidate.score,
      verdict: candidate.verdict,
      rationales: candidate.rationales,
    },
    settlement,
  };
}

export function canUseFilecoinStorage() {
  return Boolean(LIGHTHOUSE_API_KEY);
}

export async function storeReceiptBundle(
  input: StoreReceiptInput,
): Promise<ReceiptUploadResponse> {
  const fallbackReceipt = buildReceipt(input.task, input.candidate, input.settlement);

  if (!canUseFilecoinStorage()) {
    return {
      receipt: {
        ...fallbackReceipt,
        storagePlan:
          "Local receipt only. Add LIGHTHOUSE_API_KEY to pin this receipt bundle with Lighthouse and register it for Filecoin deal aggregation.",
      },
      providerUsed: "local",
      diagnostics: ["LIGHTHOUSE_API_KEY is not configured."],
    };
  }

  try {
    const upload = await lighthouse.uploadText(
      JSON.stringify(
        buildReceiptBundle({
          ...input,
          receiptId: fallbackReceipt.id,
        }),
        null,
        2,
      ),
      LIGHTHOUSE_API_KEY,
      `ghostbroker-receipt-${fallbackReceipt.id}.json`,
    );

    const cid = upload.data?.Hash;
    if (typeof cid !== "string" || cid.length === 0) {
      throw new Error("Lighthouse did not return a CID.");
    }

    return {
      receipt: {
        ...fallbackReceipt,
        receiptAnchor: `ipfs://${cid}`,
        storagePlan:
          "Receipt bundle pinned with Lighthouse and queued for Filecoin deal aggregation.",
      },
      providerUsed: "filecoin",
      diagnostics: [`Stored receipt bundle at CID ${cid}.`],
    };
  } catch (error) {
    console.error("Filecoin receipt upload failed; falling back to local receipt.", error);

    return {
      receipt: {
        ...fallbackReceipt,
        storagePlan:
          "Local receipt only. Filecoin upload failed, so this anchor remains a placeholder until storage is retried.",
      },
      providerUsed: "local",
      diagnostics: [
        error instanceof Error ? error.message : "Receipt upload failed unexpectedly.",
      ],
    };
  }
}
