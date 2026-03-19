import { NextResponse } from "next/server";

import { getEvaluation } from "@/lib/broker-evaluation-store";
import { getUniswapSettlementQuote } from "@/lib/uniswap";

type QuoteRequestBody = {
  agentId?: string;
  evaluationId?: string;
  chainId?: number | null;
  swapper?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as QuoteRequestBody;

  if (!body.evaluationId || !body.agentId) {
    return NextResponse.json(
      {
        error: "evaluationId and agentId are required.",
      },
      { status: 400 },
    );
  }

  const evaluation = getEvaluation(body.evaluationId);
  if (!evaluation) {
    return NextResponse.json(
      {
        error: "The selected evaluation could not be found.",
      },
      { status: 404 },
    );
  }

  const candidate = evaluation.candidates.find(
    (entry) => entry.agent.id === body.agentId,
  );

  if (!candidate) {
    return NextResponse.json(
      {
        error: "The selected provider is not part of the stored evaluation.",
      },
      { status: 404 },
    );
  }

  const quote = await getUniswapSettlementQuote({
    candidate,
    swapper:
      typeof body.swapper === "string" && body.swapper.length > 0
        ? (body.swapper as `0x${string}`)
        : null,
    task: evaluation.taskSnapshot,
    walletChainId: typeof body.chainId === "number" ? body.chainId : null,
  });

  return NextResponse.json(quote);
}
