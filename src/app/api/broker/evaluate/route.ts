import { NextResponse } from "next/server";

import { storeEvaluation } from "@/lib/broker-evaluation-store";
import {
  buildPrivateMemo,
  cloneTask,
  evaluateCandidates,
  type BrokerEvaluationResponse,
  type TaskForm,
} from "@/lib/ghostbroker";

export async function POST(request: Request) {
  const task = (await request.json()) as TaskForm;
  const taskSnapshot = cloneTask(task);

  const result: BrokerEvaluationResponse = {
    taskSnapshot,
    memo: buildPrivateMemo(taskSnapshot),
    candidates: evaluateCandidates(taskSnapshot),
    evaluationId: crypto.randomUUID(),
    providerUsed: "local",
  };

  storeEvaluation(result);

  return NextResponse.json(result);
}
