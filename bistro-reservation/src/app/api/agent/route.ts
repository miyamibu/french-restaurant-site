import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export function GET(request: Request) {
  const manifest = {
    site: "Bistro Joa",
    agent_entry: "/agents",
    legacy_alias: "/ai",
    discovery: {
      llms: "/llms.txt",
      info: "/info",
    },
    routes: {
      reserve: "/reserve",
      reservations_api: "/api/reservations",
      store: "/store",
      store_apron: "/store/apron",
      store_cart: "/store/cart",
      info: "/info",
    },
    reservation: {
      supports_direct_completion: true,
      direct_completion: {
        method: "POST",
        endpoint: "/api/reservations",
        required_fields: ["date", "partySize", "name", "phone"],
        optional_fields: ["arrivalTime", "note", "lineUserId", "course"],
        required_headers: {
          "Content-Type": "application/json",
        },
        optional_headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        notes: [
          "Put course preference inside course or note when needed.",
          "Send personal data in the JSON body, not in query strings.",
        ],
      },
      handoff: {
        template:
          "/reserve?mode=agent&date={YYYY-MM-DD}&partySize={1-12}&arrivalTime={HH:MM}&course={URL_ENCODED_COURSE}",
        purpose: "Optional review bridge",
      },
    },
    store: {
      supports_direct_completion: false,
      warm_handoff: {
        template: "/store/apron?mode=agent&qty={1-10}",
        stop_before: "Customer details, payment selection, and final order submission",
      },
    },
    boundaries: [
      "Seat reservations may be completed directly through /api/reservations.",
      "Store checkout must stop before customer details, payment selection, and final order submission.",
      "Avoid putting personal data in query strings.",
    ],
    compatibility: {
      reservation_handoff_template:
        "/reserve?mode=agent&date={YYYY-MM-DD}&partySize={1-12}&arrivalTime={HH:MM}&course={URL_ENCODED_COURSE}",
      store_handoff_template: "/store/apron?mode=agent&qty={1-10}",
    },
  };

  const pretty = new URL(request.url).searchParams.get("pretty") === "1";
  const body = pretty ? JSON.stringify(manifest, null, 2) : JSON.stringify(manifest);

  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
