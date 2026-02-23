import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { todayJst } from "@/lib/dates";
import { ReservationStatus, SeatType } from "@prisma/client";
import CancelButton from "@/components/cancel-button";

function formatSeat(seat: SeatType) {
  if (seat === "MAIN") return "メイン席";
  return seat;
}

export default async function AdminReservations({
  searchParams,
}: {
  searchParams: { date?: string; seatType?: string; status?: string };
}) {
  const defaultDate = format(todayJst(), "yyyy-MM-dd");
  const date = searchParams.date || defaultDate;
  const seatTypeParam = searchParams.seatType;
  const statusParam = searchParams.status;
  const seatType = seatTypeParam ? (seatTypeParam as SeatType) : undefined;
  const status = statusParam ? (statusParam as ReservationStatus) : undefined;

  const reservations = await prisma.reservation.findMany({
    where: {
      date,
      seatType: seatType ?? undefined,
      status: status
        ? status
        : {
            not: ReservationStatus.CANCELLED,
          },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">管理画面</p>
          <h1 className="text-2xl font-semibold">予約一覧</h1>
        </div>
        <Link href="/reserve" className="text-brand-700 underline">公開予約フォーム</Link>
      </header>

      <form className="card p-4 flex flex-wrap gap-4" method="get">
        <label className="text-sm text-gray-700">
          日付
          <input type="date" name="date" defaultValue={date} className="mt-1 block rounded border px-3 py-2" />
        </label>
        <label className="text-sm text-gray-700">
          席種
          <select name="seatType" defaultValue={seatType ?? ""} className="mt-1 block rounded border px-3 py-2">
            <option value="">すべて</option>
            <option value="MAIN">MAIN</option>
            <option value="ROOM1">ROOM1</option>
            <option value="ROOM2">ROOM2</option>
          </select>
        </label>
        <label className="text-sm text-gray-700">
          ステータス
          <select name="status" defaultValue={status ?? ""} className="mt-1 block rounded border px-3 py-2">
            <option value="">すべて</option>
            {Object.values(ReservationStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-primary" type="submit">
            絞り込み
          </button>
        </div>
      </form>
      <p className="text-sm text-gray-600">
        ※キャンセル済みは一覧から除外しています。表示したい場合はステータスで「CANCELLED」を選択してください。
      </p>

      <div className="card overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-2">日付</th>
              <th className="px-4 py-2">来店目安</th>
              <th className="px-4 py-2">席種</th>
              <th className="px-4 py-2">人数</th>
              <th className="px-4 py-2">氏名</th>
              <th className="px-4 py-2">電話</th>
              <th className="px-4 py-2">キャンセル</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {reservations.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{r.date}</td>
                <td className="px-4 py-2">{r.arrivalTime ?? "-"}</td>
                <td className="px-4 py-2">{formatSeat(r.seatType)}</td>
                <td className="px-4 py-2">{r.partySize}名</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.phone}</td>
                <td className="px-4 py-2">
                  <CancelButton id={r.id} disabled={r.status === ReservationStatus.CANCELLED} />
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td className="px-4 py-2 h-14 text-center text-gray-500" colSpan={7}>
                  予約がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
