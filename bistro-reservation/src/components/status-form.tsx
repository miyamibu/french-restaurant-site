"use client";

import { useState } from "react";
import { ReservationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function StatusForm({ id, current }: { id: string; current: ReservationStatus }) {
  const [status, setStatus] = useState<ReservationStatus>(current);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitStatus(nextStatus: ReservationStatus) {
    setLoading(true);
    setMessage(null);
    setStatus(nextStatus);
    const res = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setMessage(`ステータスを ${nextStatus} に更新しました`);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(`更新に失敗しました: ${data.error ?? res.status}`);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitStatus(status);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="text-sm text-gray-700">ステータス更新</label>
      <select
        className="w-full rounded border px-3 py-2"
        value={status}
        onChange={(e) => setStatus(e.target.value as ReservationStatus)}
      >
        {Object.values(ReservationStatus).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={loading}>
        {loading ? "更新中..." : "更新"}
      </Button>
      <div className="flex flex-wrap gap-2 text-sm">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => submitStatus(ReservationStatus.CANCELLED)}
        >
          キャンセルにする
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => submitStatus(ReservationStatus.DONE)}
        >
          来店済みにする
        </Button>
      </div>
      {message && <p className="text-sm text-gray-700">{message}</p>}
    </form>
  );
}
