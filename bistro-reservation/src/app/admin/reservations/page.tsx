import Link from "next/link";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { addMonths, format, getDay, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { formatJst } from "@/lib/dates";
import { Prisma, ReservationStatus } from "@prisma/client";
import CancelButton from "@/components/cancel-button";
import { parseReservationNote } from "@/lib/reservation-note";
import {
  ensureReservationSchemaReady,
  findReservationsCompat,
  isReservationSchemaNotReadyError,
} from "@/lib/reservation-compat";

export const dynamic = "force-dynamic";

function extractLastName(fullName: string): string {
  const normalized = fullName.trim();
  if (!normalized) return "";
  const parts = normalized.split(/[\s　]+/).filter(Boolean);
  return parts[0] ?? "";
}

function isDatabaseUrlMissingError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientInitializationError)) {
    return false;
  }

  return error.message.includes("Environment variable not found: DATABASE_URL");
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

  let reservations: Awaited<ReturnType<typeof findReservationsCompat>> = [];
  let todayGroupCount = 0;
  let todayPartyTotal = 0;
  let todayPrivateBlockCount = 0;
  let reservationCountByDate: Record<string, number> = {};
  let reservationLastNamesByDate: Record<string, string[]> = {};
  let privateBlockStateByDate: Record<string, { lunch: boolean; dinner: boolean }> = {};

  try {
    await ensureReservationSchemaReady(prisma);

    reservations = await findReservationsCompat(prisma, {
      where: {
        date,
        status: statusFilter,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    const todayReservations = await findReservationsCompat(prisma, {
      where: {
        date: defaultDate,
        status: statusFilter,
      },
    });

    const todayNormalReservations = todayReservations.filter(
      (row) => row.reservationType !== "PRIVATE_BLOCK"
    );
    todayGroupCount = todayNormalReservations.length;
    todayPartyTotal = todayNormalReservations.reduce((sum, row) => sum + row.partySize, 0);
    todayPrivateBlockCount = todayReservations.filter(
      (row) => row.reservationType === "PRIVATE_BLOCK"
    ).length;

    const monthReservations = await findReservationsCompat(prisma, {
      where: {
        date: {
          gte: calendarMonthStartStr,
          lte: calendarMonthEndStr,
        },
        status: statusFilter,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    const monthNormalReservations = monthReservations.filter(
      (row) => row.reservationType !== "PRIVATE_BLOCK"
    );

    reservationCountByDate = monthNormalReservations.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.date] = (acc[row.date] ?? 0) + 1;
        return acc;
      },
      {}
    );

    reservationLastNamesByDate = monthNormalReservations.reduce<Record<string, string[]>>(
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

    privateBlockStateByDate = monthReservations.reduce<
      Record<string, { lunch: boolean; dinner: boolean }>
    >((acc, row) => {
      if (row.reservationType !== "PRIVATE_BLOCK") {
        return acc;
      }

      const current = acc[row.date] ?? { lunch: false, dinner: false };
      if (row.servicePeriod === "LUNCH") {
        current.lunch = true;
      }
      if (row.servicePeriod === "DINNER") {
        current.dinner = true;
      }
      acc[row.date] = current;
      return acc;
    }, {});
  } catch (error) {
    if (isReservationSchemaNotReadyError(error)) {
      return (
        <div className="space-y-4 pt-20 pb-10">
          <h1 className="text-2xl font-semibold">予約一覧</h1>
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            予約系 migration が未適用のため、予約管理画面を一時停止しています。migration
            適用完了後に再開してください。
          </p>
        </div>
      );
    }

    if (isDatabaseUrlMissingError(error)) {
      return (
        <div className="space-y-4 pt-20 pb-10">
          <h1 className="text-2xl font-semibold">予約一覧</h1>
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            DATABASE_URL が未設定のため、予約管理画面を表示できません。.env.local に設定後、
            開発サーバーを再起動してください。
          </p>
        </div>
      );
    }

    throw error;
  }
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
        privateBlockState: privateBlockStateByDate[dateStr] ?? { lunch: false, dinner: false },
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

      <div className="card border-0 shadow-none overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-2">日付</th>
              <th className="px-4 py-2">時間帯</th>
              <th className="px-4 py-2">区分</th>
              <th className="px-4 py-2">来店目安</th>
              <th className="px-4 py-2">コース</th>
              <th className="px-4 py-2">人数</th>
              <th className="px-4 py-2">氏名</th>
              <th className="px-4 py-2">電話</th>
              <th className="px-4 py-2">内部メモ</th>
              <th className="px-4 py-2">解除</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {reservations.map((r) => {
              const { course, note } = parseReservationNote(r.note);
              const isPrivateBlock = r.reservationType === "PRIVATE_BLOCK";
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.servicePeriod === "LUNCH" ? "ランチ" : "ディナー"}</td>
                  <td className="px-4 py-2">
                    {isPrivateBlock ? (
                      <span className="inline-flex rounded bg-[#ffe7c2] px-2 py-1 text-xs font-semibold text-[#6d3b00]">
                        貸切営業
                      </span>
                    ) : (
                      <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        通常予約
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{isPrivateBlock ? "-" : r.arrivalTime ?? "-"}</td>
                  <td className="px-4 py-2">{isPrivateBlock ? "-" : course ?? "-"}</td>
                  <td className="px-4 py-2">{isPrivateBlock ? "—" : `${r.partySize}名`}</td>
                  <td className="px-4 py-2">{isPrivateBlock ? "貸切" : r.name}</td>
                  <td className="px-4 py-2">{isPrivateBlock && r.phone === "-" ? "-" : r.phone}</td>
                  <td className="px-4 py-2">{note ?? "-"}</td>
                  <td className="px-4 py-2">
                    <CancelButton
                      id={r.id}
                      disabled={r.status === ReservationStatus.CANCELLED}
                      label={isPrivateBlock ? "解除" : "キャンセル"}
                      requireOperatorName={isPrivateBlock}
                    />
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr>
                <td className="px-4 py-2 h-14 text-center text-gray-500" colSpan={10}>
                  {todayGroupCount > 0 ? (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        当日の通常予約（{todayGroupCount}組）
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        通常予約 合計 {todayPartyTotal}名 / 貸切 {todayPrivateBlockCount}件
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-700">
                      当日の通常予約：予約なし（貸切 {todayPrivateBlockCount}件）
                    </p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                    <p className="mt-1 text-xs text-gray-700">通常（{cell.count}組）</p>
                    {cell.privateBlockState.lunch || cell.privateBlockState.dinner ? (
                      <p className="mt-1 text-[11px] leading-tight text-[#8f2a2a]">
                        {cell.privateBlockState.lunch && cell.privateBlockState.dinner
                          ? "終日貸切あり"
                          : cell.privateBlockState.lunch
                          ? "ランチ貸切あり"
                          : "ディナー貸切あり"}
                      </p>
                    ) : null}
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

