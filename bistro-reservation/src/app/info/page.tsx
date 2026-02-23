export default function InfoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">店舗情報</h1>
      <div className="card p-6 space-y-3 text-gray-800">
        <p>電話予約：<a className="text-brand-700 underline" href="tel:09098297614">090-9829-7614</a></p>
        <p>当日のご予約はオンラインでは承っておりません。お電話ください。</p>
        <p>満席表示の場合でも空きが出る場合があります。お電話でご確認ください。</p>
        <p>キャンセルはお電話にてお願いいたします。</p>
      </div>
      <div className="card p-6 space-y-2 text-gray-800">
        <h2 className="text-xl font-semibold">営業時間・定休日（編集可）</h2>
        <p>営業時間：17:30 - 23:00（ラストオーダー 21:30）</p>
        <p>定休日：月・火（祝日は営業する場合があります）</p>
        <p className="text-sm text-gray-600">この文面は /info ページ内のテキストなので、編集で簡単に変更できます。</p>
      </div>
      <div className="card p-6 text-gray-800 space-y-2">
        <h2 className="text-xl font-semibold">アクセス</h2>
        <p>埼玉県戸田市中町２－１４－２４</p>
        <p>最寄り駅から徒歩○分（編集してください）</p>
      </div>
    </div>
  );
}