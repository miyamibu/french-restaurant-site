"use client";

import { useState } from "react";
import { ReservationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function CancelButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function cancel() {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: ReservationStatus.CANCELLED }),
    });
    if (res.ok) {
      setMessage("キャンセル済みにしました");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(`失敗: ${data.error ?? res.status}`);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loading}
        onClick={cancel}
      >
        {loading ? "処理中..." : "キャンセル"}
      </Button>
      {message && <span className="text-xs text-gray-600">{message}</span>}
    </div>
  );
}
