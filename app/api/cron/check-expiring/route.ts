import { NextResponse, type NextRequest } from "next/server";
import { runExpiringCheck } from "@/lib/notify/expiring";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is set, refuse — fail closed.
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const key = req.nextUrl.searchParams.get("key") ?? undefined;
  return bearer === secret || key === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized (missing/invalid CRON_SECRET)." },
      { status: 401 },
    );
  }

  const result = await runExpiringCheck();
  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    expiringCount: result.count,
    emailsSent: result.emailsSent,
    telegram: result.telegram,
    items: result.items.map((i) => ({
      label: i.label,
      days: i.days,
      expired: i.expired,
      provider: i.providerName,
    })),
  });
}

export const GET = handle;
export const POST = handle;
