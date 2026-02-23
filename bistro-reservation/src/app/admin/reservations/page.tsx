import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format, getDay, getDaysInMonth, startOfMonth } from "date-fns";
import { formatJst } from "@/lib/dates";
import { ReservationStatus } from "@prisma/client";
import CancelButton from "@/components/cancel-button";
import { parseReservationNote } from "@/lib/reservation-note";

function extractLastName(fullName: string): string {
  const normalized = fullName.trim();
  if (!normalized) return "";
  const parts = normalized.split(/[\s　]+/).filter(Boolean);
  return parts[0] ?? "";
}

export default async function AdminReservations({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const defaultDate = formatJst(new Date());
  const date = searchParams.date || defaultDate;
  const statusFilter = {
    not: ReservationStatus.CANCELLED,
  } as const;
  const selectedDate = new Date(`${date}T00:00:00`);
  const calendarMonthStart = startOfMonth(selectedDate);
  const calendarMonthDays = getDaysInMonth(calendarMonthStart);
  const calendarFirstWeekday = getDay(calendarMonthStart);
  const calendarMonthStartStr = format(calendarMonthStart, "yyyy-MM-dd");
  const calendarMonthEndStr = format(
    new Date(
      calendarMonthStart.getFullYear(),
      calendarMonthStart.getMonth(),
      calendarMonthDays
    ),
    "yyyy-MM-dd"
  );

  const reservations = await prisma.reservation.findMany({
    where: {
      date,
      status: statusFilter,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const todayReservations = await prisma.reservation.findMany({
    where: {
      date: defaultDate,
      status: statusFilter,
    },
    select: {
      partySize: true,
    },
  });
  const todayGroupCount = todayReservations.length;
  const todayPartyTotal = todayReservations.reduce((sum, row) => sum + row.partySize, 0);
  const monthReservations = await prisma.reservation.findMany({
    where: {
      date: {
        gte: calendarMonthStartStr,
        lte: calendarMonthEndStr,
      },
      status: statusFilter,
    },
    select: { date: true, name: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const reservationCountByDate = monthReservations.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.date] = (acc[row.date] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const reservationLastNamesByDate = monthReservations.reduce<Record<string, string[]>>(
    (acc, row) => {
      const lastName = extractLastName(row.name);
      if (!lastName) return acc;
      const current = acc[row.date] ?? [];
      if (!current.includes(lastName)) current.push(lastName);
      acc[row.date] = current;
      return acc;
    },
    {}
  );
  const calendarCells = [
    ...Array.from({ length: calendarFirstWeekday }, () => null),
    ...Array.from({ length: calendarMonthDays }, (_, idx) => {
      const day = idx + 1;
      const dateStr = format(
        new Date(
          calendarMonthStart.getFullYear(),
          calendarMonthStart.getMonth(),
          day
        ),
        "yyyy-MM-dd"
      );
      return {
        dateStr,
        day,
        count: reservationCountByDate[dateStr] ?? 0,
        lastNames: reservationLastNamesByDate[dateStr] ?? [],
      };
    }),
  ];
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const buildDateHref = (dateStr: string) => {
    const params = new URLSearchParams();
    params.set("date", dateStr);
    return `/admin/reservations?${params.toString()}`;
  };

  return (
    <div className="space-y-6 pt-20 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">管理画面</p>
          <h1 className="text-2xl font-semibold">予約一覧</h1>
        </div>
        <Link href="/reserve" className="text-brand-700 underline">公開予約フォーム</Link>
      </header>

      <form className="card !border-0 p-4 !shadow-none flex flex-wrap gap-4" method="get">
        <label className="text-sm text-gray-700">
          日付
          <input type="date" name="date" defaultValue={date} className="mt-1 block rounded border px-3 py-2" />
        </label>
        <div className="flex items-end">
          <button className="btn-primary" type="submit">
            絞り込み
          </button>
        </div>
      </form>
      <p className="text-sm text-gray-600">※キャンセル済みは一覧から除外しています。</p>

      <div className="card border-0 shadow-none overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-2">日付</th>
              <th className="px-4 py-2">来店目安</th>
              <th className="px-4 py-2">コース</th>
              <th className="px-4 py-2">人数</th>
              <th className="px-4 py-2">氏名</th>
              <th className="px-4 py-2">電話</th>
              <th className="px-4 py-2">キャンセル</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {reservations.map((r) => {
              const { course } = parseReservationNote(r.note);
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.arrivalTime ?? "-"}</td>
                  <td className="px-4 py-2">{course ?? "-"}</td>
                  <td className="px-4 py-2">{r.partySize}名</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">
                    <CancelButton id={r.id} disabled={r.status === ReservationStatus.CANCELLED} />
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr>
                <td className="px-4 py-2 h-14 text-center text-gray-500" colSpan={7}>
                  {todayGroupCount > 0 ? (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        当日の予約状況（{todayGroupCount}組）
                      </p>
                      <p className="mt-1 text-xs text-gray-500">合計 {todayPartyTotal}名</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-700">当日の予約状況：予約なし</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card border-0 p-4 shadow-none">
        <h2 className="text-base font-semibold text-gray-800">
          月間予約カレンダー（{format(calendarMonthStart, "yyyy年M月")}）
        </h2>
        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-gray-600">
          {dayLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) =>
            cell ? (
              <Link
                key={cell.dateStr}
                href={buildDateHref(cell.dateStr)}
                aria-current={cell.dateStr === date ? "date" : undefined}
                className={[
                  "block min-h-[94px] rounded border p-2 text-center transition hover:bg-[#f7f4ee]",
                  cell.dateStr === date
                    ? "border-[#2f1b0f] bg-[#f8f5ef]"
                    : "border-gray-200 bg-white",
                ].join(" ")}
              >
                <p className="text-sm font-medium text-gray-900">{cell.day}</p>
                {cell.dateStr >= defaultDate ? (
                  <>
                    <p className="mt-1 text-xs text-gray-700">（{cell.count}組）</p>
                    {cell.lastNames.length > 0 ? (
                      <p className="mt-1 text-[11px] leading-tight text-gray-700">
                        {cell.lastNames.join("・")}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </Link>
            ) : (
              <div key={`blank-${idx}`} className="min-h-[94px]" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

