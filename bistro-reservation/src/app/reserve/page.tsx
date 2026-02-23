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

const menuHeadingSize = { base: 17, md: 45 };

export default function ReservePage() {
  const defaultDate = formatJst(addDays(todayJst(), 1));
  const reservePageSpacing = { top:150, bottom: 80 }; // 上下余白の微調整(px)

  return (
    <div
      className="space-y-6"
      style={{
        paddingTop: `${reservePageSpacing.top}px`,
        paddingBottom: `${reservePageSpacing.bottom}px`,
      }}
    >
      <header className="text-center">
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
      <ReserveForm defaultDate={defaultDate} />
    </div>
  );
}

