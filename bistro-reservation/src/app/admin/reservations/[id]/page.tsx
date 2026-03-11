import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusForm } from "@/components/status-form";
import { parseReservationNote } from "@/lib/reservation-note";

export const dynamic = "force-dynamic";

export default async function AdminReservationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) {
    return <p className="text-gray-700">予約が見つかりませんでした。</p>;
  }
  const { course, note } = parseReservationNote(reservation.note);

  return (
    <div className="space-y-4 pt-20">
      <Link className="text-brand-700 underline" href="/admin/reservations">
        ← 一覧に戻る
      </Link>
      <h1 className="text-2xl font-semibold">予約詳細</h1>
      <div className="card p-6 space-y-2 text-sm">
        <p>日付: {reservation.date}</p>
        <p>時間帯: {reservation.servicePeriod === "LUNCH" ? "ランチ" : "ディナー"}</p>
        <p>コース: {course ?? "-"}</p>
        <p>人数: {reservation.partySize}名</p>
        <p>来店目安: {reservation.arrivalTime ?? "未入力"}</p>
        <p>氏名: {reservation.name}</p>
        <p>電話: {reservation.phone}</p>
        <p>要望: {note ?? "なし"}</p>
        <p>ステータス: {reservation.status}</p>
        <p>作成: {reservation.createdAt.toISOString()}</p>
      </div>

      <div className="card p-4">
        <StatusForm id={reservation.id} current={reservation.status} />
      </div>
    </div>
  );
}
