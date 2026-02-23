import { addDays, format } from "date-fns";
import { todayJst } from "@/lib/dates";
import { ReserveForm } from "@/components/reserve-form";

export default function ReservePage() {
  const defaultDate = format(addDays(todayJst(), 1), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">オンライン予約</h1>
      <div className="space-y-1 text-gray-700 text-sm">
        <p>当日のオンライン予約は承っておりません。</p>
        <p>満席表示の場合でも空きが出る場合があります。</p>
        <p>キャンセルはお電話にてお願いいたします</p>
        <p>個室は2〜4名様、ROOM1/ROOM2 を指定でご予約ください。</p>
        <p>電話番号：090-9829-7614</p>
      </div>
      <ReserveForm defaultDate={defaultDate} />
    </div>
  );
}
