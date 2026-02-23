import { Reservation, SeatType } from "@prisma/client";

interface ReservationEmailPayload {
  reservation: Reservation;
  adminUrl?: string;
}

// 送信元アドレスはプロバイダで認証済みのドメインを使うこと
const defaultFrom = process.env.EMAIL_FROM ?? process.env.STORE_NOTIFY_EMAIL ?? "no-reply@example.com";

export async function sendReservationEmail({ reservation, adminUrl }: ReservationEmailPayload) {
  const provider = process.env.EMAIL_PROVIDER;
  const apiKey = process.env.EMAIL_API_KEY;
  const to = process.env.STORE_NOTIFY_EMAIL;
  if (!provider || !apiKey || !to) {
    console.info("Email skipped: provider/apiKey/to missing", { provider: !!provider, apiKey: !!apiKey, to: !!to });
    return { skipped: true, reason: "MISSING_ENV" as const };
  }

  const subject = `【新規予約】${reservation.date} ${reservation.partySize}名 ${reservation.seatType}`;
  const body = [
    `日付: ${reservation.date}`,
    `席種: ${reservation.seatType}`,
    `人数: ${reservation.partySize}`,
    `来店目安: ${reservation.arrivalTime ?? "未入力"}`,
    `氏名: ${reservation.name}`,
    `電話: ${reservation.phone}`,
    `要望: ${reservation.note ?? "なし"}`,
    adminUrl ? `管理画面: ${adminUrl}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (provider === "resend") {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: defaultFrom,
        to,
        subject,
        text: body,
      });
      return { sent: true, provider };
    }

    if (provider === "sendgrid") {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to,
        from: defaultFrom,
        subject,
        text: body,
      });
      return { sent: true, provider };
    }

    console.warn(`Unknown EMAIL_PROVIDER: ${provider}`);
    return { skipped: true, reason: "UNKNOWN_PROVIDER" as const };
  } catch (error) {
    console.error("Email send failed", { provider, error });
    return { skipped: true, reason: "SEND_FAILED" as const };
  }
}
