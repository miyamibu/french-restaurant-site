"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const courseOptions = [
  {
    label: "ランチ: プティラ Petite La course",
    value: "ランチ: プティラ　Petite La course",
  },
  {
    label: "ランチ: 席のみ",
    value: "ランチ: 席のみ",
  },
  {
    label: "ディナー: ジョワ Joie course",
    value: "ディナー: ジョワ　Joie course",
  },
  {
    label: "ディナー: サンキャトル Cent Quatre course",
    value: "ディナー: サンキャトル　Cent Quatre course",
  },
  {
    label: "ディナー: 席のみ",
    value: "ディナー: 席のみ",
  },
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDate() {
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  return toDateInputValue(nextDay);
}

export function AgentReservationBuilder() {
  const [date, setDate] = useState(getDefaultDate);
  const [partySize, setPartySize] = useState("2");
  const [arrivalTime, setArrivalTime] = useState("18:00");
  const [course, setCourse] = useState(courseOptions[0].value);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const params = new URLSearchParams({
    mode: "agent",
    date,
    partySize,
    arrivalTime,
    course,
  });
  const handoffUrl = `/reserve?${params.toString()}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(handoffUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }

    window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#cfa96d]/40 bg-[#fff7e6] p-4 text-sm text-[#4a3121]">
      <p className="font-semibold text-[#2f1b0f]">Reservation handoff builder</p>
      <p className="mt-2 leading-6">
        Optional fallback for agents that want to hand the guest to `/reserve` instead of calling
        ` POST /api/reservations` directly. Keep personal data in the POST body, not in this URL.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="agent-reservation-date">Date</Label>
          <Input
            id="agent-reservation-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="border-[#b9965a] bg-white"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="agent-reservation-party-size">Party Size</Label>
          <select
            id="agent-reservation-party-size"
            value={partySize}
            onChange={(event) => setPartySize(event.target.value)}
            className="h-10 rounded-md border border-[#b9965a] bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-[#8a6233]/25"
          >
            {Array.from({ length: 12 }, (_, index) => `${index + 1}`).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="agent-reservation-arrival-time">Arrival Time</Label>
          <Input
            id="agent-reservation-arrival-time"
            type="time"
            value={arrivalTime}
            onChange={(event) => setArrivalTime(event.target.value)}
            className="border-[#b9965a] bg-white"
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="agent-reservation-course">Course</Label>
          <select
            id="agent-reservation-course"
            value={course}
            onChange={(event) => setCourse(event.target.value)}
            className="h-10 rounded-md border border-[#b9965a] bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-[#8a6233]/25"
          >
            {courseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Label htmlFor="agent-reservation-handoff-url">Generated handoff URL</Label>
        <Input
          id="agent-reservation-handoff-url"
          readOnly
          value={handoffUrl}
          className="border-[#b9965a] bg-white text-xs"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={handoffUrl}
          className="inline-flex items-center justify-center rounded-full bg-[#2f1b0f] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Open Handoff
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-full border border-[#2f1b0f] px-4 py-2 text-sm font-semibold text-[#2f1b0f] transition hover:bg-white/70"
        >
          Copy URL
        </button>
        {copyStatus === "copied" ? <span className="text-xs text-[#7b5a2d]">Copied</span> : null}
        {copyStatus === "failed" ? (
          <span className="text-xs text-[#9f2b2b]">Copy failed</span>
        ) : null}
      </div>
    </div>
  );
}
