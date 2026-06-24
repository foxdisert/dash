import { NextResponse, type NextRequest } from "next/server";
import { recordOrder, notifyNewOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.ORDERS_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed
  const header =
    req.headers.get("x-webhook-secret") ??
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice(7)
      : undefined);
  const key = req.nextUrl.searchParams.get("key") ?? undefined;
  return header === secret || key === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized (missing/invalid ORDERS_WEBHOOK_SECRET)." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be JSON." },
      { status: 400 },
    );
  }

  const result = recordOrder(body);
  if (!result.duplicate) {
    // Fire-and-forget; don't fail the webhook if Telegram hiccups.
    notifyNewOrder(result.orderId).catch(() => {});
  }

  return NextResponse.json(result);
}
