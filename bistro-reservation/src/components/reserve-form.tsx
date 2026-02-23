"use client";

import { useEffect, useMemo, useState } from "react";
import { SeatType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  defaultDate: string;
}

interface AvailabilityState {
  bookable: boolean;
  reason: string;
  mainRemaining: number;
  room1Available: boolean;
  room2Available: boolean;
  callPhone: string;
  callMessage: string;
}

const phoneDisplay = "090-9829-7614";

const initialAvailability: AvailabilityState = {
  bookable: false,
  reason: "CHECKING",
  mainRemaining: 0,
  room1Available: false,
  room2Available: false,
  callPhone: "09098297614",
  callMessage: "お電話でお問い合わせください",
};

export function ReserveForm({ defaultDate }: Props) {
  const [form, setForm] = useState({
    date: defaultDate,
    seatType: "MAIN" as SeatType,
    partySize: 2,
    arrivalTime: "",
    name: "",
    phone: "",
    note: "",
  });
  const [availability, setAvailability] = useState<AvailabilityState>(initialAvailability);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setAvailability((prev) => ({ ...prev, reason: "CHECKING" }));
    fetch(`/api/availability?date=${form.date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setAvailability(data);
      })
      .catch(() => {
        if (!active) return;
        setAvailability({ ...initialAvailability, reason: "ERROR" });
      });
    return () => {
      active = false;
    };
  }, [form.date]);

  const partyMin = 1;
  const partyMax = 12;

  function updateField<T extends keyof typeof form>(key: T, value: (typeof form)[T]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        partySize: Number(form.partySize),
        arrivalTime: form.arrivalTime || undefined,
        note: form.note || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data.summary ?? "ご予約を受け付けました。");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.reason ?? "予約に失敗しました。お電話ください。");
    }
    setSubmitting(false);
  }

  const showCallOut =
    availability.reason === "SAME_DAY_BLOCKED" ||
    availability.reason === "OUT_OF_RANGE" ||
    availability.reason === "FULL";

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="rounded-md bg-gray-50 p-4 text-sm space-y-1">
        <p className="font-medium">空き状況</p>
        <p>メイン席: 残り {availability.mainRemaining} 席</p>
        <p className="text-xs text-gray-600">貸し切りは10名以上でお申し込みください。</p>
        {showCallOut && <p className="text-red-700 font-semibold">{availability.callMessage}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">日付</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => updateField("date", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="party">人数</Label>
          <Input
            id="party"
            type="number"
            min={partyMin}
            max={partyMax}
            value={form.partySize}
            onChange={(e) => updateField("partySize", Number(e.target.value))}
            required
          />
          <p className="text-xs text-gray-600">貸し切りは10名以上でご入力ください。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">来店目安時刻（任意・17:30以降）</Label>
          <Input
            id="time"
            type="time"
            value={form.arrivalTime}
            onChange={(e) => updateField("arrivalTime", e.target.value)}
            min="17:30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">氏名</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">電話番号</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">要望（任意）</Label>
        <Textarea
          id="note"
          value={form.note}
          onChange={(e) => updateField("note", e.target.value)}
          placeholder="アレルギーや記念日のご希望など"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || availability.reason === "SAME_DAY_BLOCKED" || availability.reason === "OUT_OF_RANGE"}
      >
        {submitting ? "送信中..." : "予約する"}
      </Button>

      {result && <p className="text-green-700 text-sm">{result}</p>}
      {error && <p className="text-red-700 text-sm">{error}</p>}
    </form>
  );
}
