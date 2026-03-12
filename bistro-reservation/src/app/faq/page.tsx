import { RESERVATION_FAQ_ITEMS } from "@/lib/reservation-copy";

export default function FaqPage() {
  return (
    <section className="space-y-6 pb-16 pt-24 md:pt-20">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a6233]">FAQ</p>
        <h1 className="text-3xl font-semibold text-[#2f1b0f]">よくあるご質問</h1>
      </header>

      <div className="space-y-4">
        {RESERVATION_FAQ_ITEMS.map((item) => (
          <article
            key={item.question}
            className="rounded-2xl border border-[#cfa96d]/30 bg-white p-5 text-[#4a3121] shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[#2f1b0f]">{item.question}</h2>
            <p className="mt-2 leading-7">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
