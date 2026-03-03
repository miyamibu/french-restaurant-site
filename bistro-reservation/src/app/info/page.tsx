import { CONTACT_PHONE_DISPLAY, CONTACT_TEL_LINK } from "@/lib/contact";

export default function InfoPage() {
  const infoSpacing = { top: "90px", bottom: "80px" };

  return (
    <div
      className="space-y-4 pt-[var(--info-top-padding)] pb-[var(--info-bottom-padding)]"
      style={{
        "--info-top-padding": infoSpacing.top,
        "--info-bottom-padding": infoSpacing.bottom,
      } as Record<string, string>}
    >
      <h1 className="text-3xl font-semibold">店舗情報</h1>
      <div className="card p-6 space-y-2 text-gray-800">
        <h2 className="text-xl font-semibold">営業時間・定休日（編集可）</h2>
        <p>営業時間：10：30～14：00　17:30～23:00（ラストオーダー 21:30）</p>
        <p>定休日：月・火（祝日は営業する場合があります）</p>
        <p className="text-sm text-gray-600"></p>
      </div>
      <div className="card p-6 space-y-3 text-gray-800">
        <p>
          電話予約：
          <a className="text-brand-700 underline" href={CONTACT_TEL_LINK}>
            {CONTACT_PHONE_DISPLAY}
          </a>
        </p>
        <p>当日のご予約はオンラインでは承っております。</p>
        <p>満席表示の場合でも空きが出る場合があります。お電話でご確認ください。</p>
        <p>キャンセルはお電話にてお願いいたします。</p>
      </div>

      <div className="card p-6 text-gray-800 space-y-2">
        <h2 className="text-xl font-semibold">アクセス</h2>
        <p>〒350-0824 埼玉県川越市石原町１丁目４７−７</p>
        <p>最寄り駅からめちゃ遠いです。駐車場は５台分あります。</p>
      </div>
    </div>
  );
}
