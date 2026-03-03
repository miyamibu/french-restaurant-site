import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const body = `# AI Agent Guide (Bistro Joa)

Primary entry:
- /agents

Legacy alias:
- /ai -> /agents

Reservation:
- Direct completion: POST /api/reservations
- Required JSON fields: date, partySize, name, phone
- Optional JSON fields: arrivalTime, note, lineUserId, course
- Required header: Content-Type: application/json
- Optional header: X-Requested-With: XMLHttpRequest
- Optional handoff review URL: /reserve?mode=agent&date=YYYY-MM-DD&partySize=2&arrivalTime=18:00&course=...

Store:
- Warm handoff only: /store/apron?mode=agent&qty=1

Important:
- Final store submission must be completed by a human on the destination page.
- Do not place names, phone numbers, emails, or addresses in query strings. Put personal data in POST bodies only.
- Use /info for business hours, phone contact, and in-person policies.
`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
