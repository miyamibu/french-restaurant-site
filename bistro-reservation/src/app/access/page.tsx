import Link from "next/link";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL_LINK } from "@/lib/contact";
import {
  RESERVATION_BUSINESS_HOURS_TEXT,
  RESERVATION_CLOSED_TEXT,
  RESERVATION_CUTOFF_TEXT,
  RESERVATION_WEB_HOURS_TEXT,
} from "@/lib/reservation-config";

export default function InfoPage() {
  const infoSpacing = { topMobile: "76px", topDesktop: "90px", bottom: "80px" };

  return (
    <div
      className="space-y-4 pb-[var(--info-bottom-padding)] pt-[var(--info-top-padding-mobile)] md:pt-[var(--info-top-padding-desktop)]"
      style={{
        "--info-top-padding-mobile": infoSpacing.topMobile,
        "--info-top-padding-desktop": infoSpacing.topDesktop,
        "--info-bottom-padding": infoSpacing.bottom,
      } as Record<string, string>}
    >
      <h1 className="-mt-[26px] text-3xl font-semibold md:mt-0">店舗情報</h1>
      <div className="card space-y-4 p-6 text-[14px] leading-6 text-gray-800 md:text-base">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">営業時間</h2>
          <p>{RESERVATION_BUSINESS_HOURS_TEXT}</p>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Web予約</h2>
          <p>{RESERVATION_WEB_HOURS_TEXT}</p>
          <p>{RESERVATION_CUTOFF_TEXT}</p>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">定休日</h2>
          <p>{RESERVATION_CLOSED_TEXT}</p>
        </div>
      </div>

      <div className="card space-y-3 p-6 text-[14px] leading-6 text-gray-800 md:text-base">
        <p>
          電話予約：
          <a className="text-brand-700 underline" href={CONTACT_TEL_LINK}>
            {CONTACT_PHONE_DISPLAY}
          </a>
        </p>
        <p>当日のWeb予約は承っておりません。</p>
        <p>満席表示や締切後でもご案内できる場合があります。お電話でご確認ください。</p>
        <p>キャンセルはお電話にてお願いいたします。</p>
        <p>
          詳しい予約条件は
          <Link className="ml-1 underline" href="/faq">
            FAQ
          </Link>
          にも掲載しています。
        </p>
      </div>

      <div className="card space-y-2 p-6 text-[14px] leading-6 text-gray-800 md:text-base">
        <h2 className="text-xl font-semibold">アクセス</h2>
        <p>〒350-0824 埼玉県川越市石原町１丁目４７−７</p>
        <p>最寄り駅からめちゃ遠いです。駐車場は５台分あります。</p>
      </div>
    </div>
  );
}
