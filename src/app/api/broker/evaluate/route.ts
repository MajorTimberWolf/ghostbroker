import { NextResponse } from "next/server";

import { storeEvaluation } from "@/lib/broker-evaluation-store";
import {
  buildPrivateMemo,
  cloneTask,
  evaluateCandidates,
  type BrokerEvaluationResponse,
  type TaskForm,
} from "@/lib/ghostbroker";
import { canUseVenice, evaluateWithVenice } from "@/lib/venice";

export async function POST(request: Request) {
  const task = (await request.json()) as TaskForm;
  const taskSnapshot = cloneTask(task);
  let result: BrokerEvaluationResponse;

  if (canUseVenice()) {
    try {
      const evaluation = await evaluateWithVenice(taskSnapshot);
      result = {
        taskSnapshot,
        memo: evaluation.memo,
        candidates: evaluation.candidates,
        evaluationId: crypto.randomUUID(),
        providerUsed: "venice",
      };
    } catch (error) {
      console.error("Venice evaluation failed; falling back to local scoring.", error);
      result = {
        taskSnapshot,
        memo: buildPrivateMemo(taskSnapshot),
        candidates: evaluateCandidates(taskSnapshot),
        evaluationId: crypto.randomUUID(),
        providerUsed: "local",
      };
    }
  } else {
    result = {
      taskSnapshot,
      memo: buildPrivateMemo(taskSnapshot),
      candidates: evaluateCandidates(taskSnapshot),
      evaluationId: crypto.randomUUID(),
      providerUsed: "local",
    };
  }

  storeEvaluation(result);

  return NextResponse.json(result);
}
