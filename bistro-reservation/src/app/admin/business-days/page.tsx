"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function BusinessDaysPage() {
  const [date, setDate] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    fetch(`/api/admin/business-days?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setIsClosed(!!data.isClosed);
          setNote(data.note ?? "");
        }
      });
  }, [date]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/business-days", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ date, isClosed, note: note || null }),
    });
    if (res.ok) {
      setMessage("保存しました");
    } else {
      setMessage("保存に失敗しました");
    }
  }

  return (
    <div className="space-y-4 pt-20">
      <h1 className="text-2xl font-semibold">休業日管理</h1>
      <form onSubmit={submit} className="card p-6 space-y-3">
        <label className="text-sm text-gray-700">
          日付
          <input
            type="date"
            className="mt-1 block rounded border px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />
          この日は休業にする
        </label>
        <label className="text-sm text-gray-700">
          メモ
          <input
            type="text"
            className="mt-1 block w-full rounded border px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: 貸切のため"
          />
        </label>
        <Button type="submit">保存</Button>
        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>
      <p className="text-sm text-gray-700">
        isClosed=true の日はオンライン予約を受け付けません。電話予約のみご案内ください。
      </p>
    </div>
  );
}
