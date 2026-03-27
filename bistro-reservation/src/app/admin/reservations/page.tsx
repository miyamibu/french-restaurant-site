import Link from "next/link";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { addMonths, format, getDay, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { formatJst } from "@/lib/dates";
import {
  ReservationStatus,
} from "@prisma/client";
import {
  AdminReservationsList,
  type AdminReservationListItem,
} from "@/components/admin-reservations-list";
import { buildMockReservations } from "@/lib/admin-reservation-mock";
import { parseReservationNote } from "@/lib/reservation-note";
import { findReservationsCompat } from "@/lib/reservation-compat";

export const dynamic = "force-dynamic";

function extractLastName(fullName: string): string {
  const normalized = fullName.trim();
  if (!normalized) return "";
  const parts = normalized.split(/[\s　]+/).filter(Boolean);
  return parts[0] ?? "";
}

export default async function AdminReservations({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const defaultDate = formatJst(new Date());
  const date = resolvedSearchParams.date || defaultDate;
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
  const isMockMode = !process.env.DATABASE_URL;
  const mockReservations = isMockMode
    ? buildMockReservations(calendarMonthStart, calendarMonthDays)
    : [];

  const reservations = isMockMode
    ? mockReservations.filter((row) => row.date === date && row.status !== ReservationStatus.CANCELLED)
    : await findReservationsCompat(prisma, {
        where: {
          date,
          status: statusFilter,
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      });
  const todayReservations = isMockMode
    ? mockReservations.filter(
        (row) => row.date === defaultDate && row.status !== ReservationStatus.CANCELLED
      )
    : await findReservationsCompat(prisma, {
        where: {
          date: defaultDate,
          status: statusFilter,
        },
      });
  const todayGroupCount = todayReservations.length;
  const todayPartyTotal = todayReservations.reduce((sum, row) => sum + row.partySize, 0);
  const monthReservations = isMockMode
    ? mockReservations.filter(
        (row) =>
          row.date >= calendarMonthStartStr &&
          row.date <= calendarMonthEndStr &&
          row.status !== ReservationStatus.CANCELLED
      )
    : await findReservationsCompat(prisma, {
        where: {
          date: {
            gte: calendarMonthStartStr,
            lte: calendarMonthEndStr,
          },
          status: statusFilter,
        },
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
  const buildDateHref = (dateStr: string): Route => {
    const params = new URLSearchParams();
    params.set("date", dateStr);
    return `/admin/reservations?${params.toString()}` as Route;
  };
  const buildMonthHref = (offset: number): Route => {
    const monthDate =
      offset < 0
        ? subMonths(calendarMonthStart, Math.abs(offset))
        : addMonths(calendarMonthStart, offset);
    return buildDateHref(format(monthDate, "yyyy-MM-01"));
  };
  const reservationListItems: AdminReservationListItem[] = reservations.map((reservation) => {
    const { course, note } = parseReservationNote(reservation.note);

    return {
      id: reservation.id,
      date: reservation.date,
      servicePeriod: reservation.servicePeriod,
      servicePeriodLabel: reservation.servicePeriod === "LUNCH" ? "ランチ" : "ディナー",
      arrivalTime: reservation.arrivalTime ?? null,
      course,
      partySize: reservation.partySize,
      name: reservation.name,
      phone: reservation.phone,
      request: note,
      cancelDisabled: isMockMode || reservation.status === ReservationStatus.CANCELLED,
    };
  });

  return (
    <div className="space-y-6 pt-20 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">管理画面</p>
          <h1 className="text-2xl font-semibold">予約一覧</h1>
        </div>
        <Link href="/booking" className="text-brand-700 underline">公開予約フォーム</Link>
      </header>

      <p className="text-sm text-gray-600">※キャンセル済みは一覧から除外しています。</p>
      {isMockMode ? (
        <p className="text-sm text-amber-700">
          ローカル確認用のサンプル予約を表示しています。`DATABASE_URL` を設定すると実データに切り替わります。
        </p>
      ) : null}

      {reservations.length > 0 ? (
        <AdminReservationsList selectedDate={date} reservations={reservationListItems} />
      ) : (
        <div className="card border-0 shadow-none">
          <div className="px-4 py-8 text-center text-gray-500">
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
          </div>
        </div>
      )}

      <div className="card border-0 p-4 shadow-none">
        <div className="grid grid-cols-7 items-center gap-2">
          <Link
            href={buildMonthHref(-1)}
            aria-label="前の月へ"
            className="justify-self-center px-2 py-1 text-[35px] font-medium leading-none text-gray-700 transition hover:text-[#2f1b0f]"
          >
            ←
          </Link>
          <h2 className="col-span-5 text-center text-base font-semibold text-gray-800">
            月間予約カレンダー（{format(calendarMonthStart, "yyyy年M月")}）
          </h2>
          <Link
            href={buildMonthHref(1)}
            aria-label="次の月へ"
            className="justify-self-center px-2 py-1 text-[35px] font-medium leading-none text-gray-700 transition hover:text-[#2f1b0f]"
          >
            →
          </Link>
        </div>
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
