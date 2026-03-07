import "@/lib/css/liftkitvars.css";
import { addDays } from "date-fns";
import { Tangerine } from "next/font/google";
import { formatJst, todayJst } from "@/lib/dates";
import { ReserveForm } from "@/components/reserve-form";

const tangerine = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const menuHeadingSize = { base: 24, md: 45 };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReservePage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const defaultDate = formatJst(addDays(todayJst(), 1));
  const reservePageSpacing = { top: 150 }; // 上余白の微調整(px)
  const isAgentMode = getFirstParam(resolvedSearchParams.mode) === "agent";

  return (
    <div
      className="space-y-6 pb-1 md:pb-20"
      style={{
        paddingTop: `${reservePageSpacing.top}px`,
      }}
    >
      <header className="-mt-[76px] text-center md:mt-0">
        <h1
          className={`menu-heading-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
          style={
            {
              "--menu-heading-size": `${menuHeadingSize.base}px`,
              "--menu-heading-size-md": `${menuHeadingSize.md}px`,
            } as Record<string, string>
          }
      >
        RESERVA
      </h1>
      </header>
      <ReserveForm
        defaultDate={defaultDate}
        initialDate={getFirstParam(resolvedSearchParams.date)}
        initialPartySize={getFirstParam(resolvedSearchParams.partySize)}
        initialCourse={getFirstParam(resolvedSearchParams.course)}
        initialArrivalTime={getFirstParam(resolvedSearchParams.arrivalTime)}
        afterAvailabilityNote={
          isAgentMode
            ? [
                "AI経由の事前入力です。必要に応じて内容を確認・調整して送信できます。",
                "氏名・電話番号などの個人情報は、URLクエリではなくこの画面かAPI本文で扱ってください。",
              ]
            : undefined
        }
      />
    </div>
  );
}

