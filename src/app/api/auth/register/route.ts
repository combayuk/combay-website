import { NextRequest, NextResponse } from "next/server";

// PRE-LAUNCH: Registration disabled until database is connected.
// Use the demo accounts on the login page to test the portal.
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Registration is not available in preview mode. Use the demo account to test the portal." },
    { status: 503 }
  );
}
