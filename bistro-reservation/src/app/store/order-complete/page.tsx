"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Noto_Serif_JP, Tangerine } from "next/font/google";

const headingFont = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const bodySerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600"],
});

function OrderCompleteContent() {
  const searchParams = useSearchParams();
  const method = searchParams.get("method");

  const messages = {
    "bank-transfer": {
      title: "ご注文ありがとうございました",
      description:
        "メールで振込先口座情報をお送りいたします。ご入金確認後、商品を発送いたします。ご不明な点がございましたらお気軽にお問い合わせください。",
    },
    "cash-store": {
      title: "ご注文ありがとうございました",
      description:
        "ご来店予定日をメールでお知らせいただきます。商品はご来店予定日に合わせて用意してお待ちしております。",
    },
  };

  const message = messages[method as keyof typeof messages] || messages["bank-transfer"];

  return (
    <section
      className="relative w-screen bg-gradient-to-b from-[#f7ebd3] via-[#f1ddb5] to-[#e8c98f] px-4 flex items-center"
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        minHeight: "100vh",
        paddingTop: "132px",
        paddingBottom: "140px",
      }}
    >
      <div className="mx-auto max-w-2xl w-full text-center">
        <header className="mb-12">
          <h1
            className={`font-semibold text-[#2f1b0f] ${headingFont.className}`}
            style={{ fontSize: "clamp(2rem, 4vw, 5rem)" }}
          >
            {message.title}
          </h1>
        </header>

        <div className={`${bodySerif.className} mb-12 space-y-6`}>
          <p className="text-lg text-[#4a3121] leading-relaxed">
            {message.description}
          </p>

          <div className="bg-white/60 p-6 rounded-lg border border-[#2f1b0f]">
            <p className="text-sm text-[#4a3121]">
              {method === "bank-transfer"
                ? "ご注文確認メールをお送りしております。メール内の振込先情報をご確認ください。"
                : "ご注文確認メールをお送りしております。来店予定日の変更がございましたらお気軽にご連絡ください。"}
            </p>
          </div>
        </div>

        <Link
          href="/store"
          className="inline-block py-4 px-8 bg-[#2f1b0f] text-white font-semibold rounded-full hover:brightness-110 transition"
        >
          商品一覧へ戻る
        </Link>
      </div>
    </section>
  );
}

export default function OrderCompletePage() {
  return (
    <Suspense
      fallback={
        <section
          className="relative w-screen bg-gradient-to-b from-[#f7ebd3] via-[#f1ddb5] to-[#e8c98f] px-4 flex items-center"
          style={{
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)",
            minHeight: "100vh",
          }}
        >
          <div className="mx-auto">読み込み中...</div>
        </section>
      }
    >
      <OrderCompleteContent />
    </Suspense>
  );
}
