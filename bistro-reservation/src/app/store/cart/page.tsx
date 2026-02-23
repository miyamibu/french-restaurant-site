"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Noto_Serif_JP, Tangerine } from "next/font/google";
import { formatYen, getCartItems, type StoreCartItem, clearCart, removeFromCart } from "@/lib/store-cart";

const headingFont = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const bodySerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600"],
});

const pageSpacing = { top: 132, bottom: 140 };
const menuHeadingSize = { base: 32, md: 60 };

type PaymentMethod = "bank-transfer" | "cash-store" | null;

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  zipCode: string;
  prefecture: string;
  city: string;
  address: string;
  building: string;
}

// 営業日判定（月火水が定休日）
function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // 0: 日, 1: 月, 2: 火, 3: 水, 4: 木, 5: 金, 6: 土
  return dayOfWeek !== 1 && dayOfWeek !== 2 && dayOfWeek !== 3;
}

// 来店可能な日付の範囲を計算（注文日から２週間〜３０日）
function getStoreDateRange(): { minDate: string; maxDate: string } {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 14); // 2週間後

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30); // 30日後

  return {
    minDate: minDate.toISOString().split("T")[0],
    maxDate: maxDate.toISOString().split("T")[0],
  };
}

const prefectures = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

export default function StoreCartPage() {
  const router = useRouter();
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [storeVisitDate, setStoreVisitDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
    zipCode: "",
    prefecture: "",
    city: "",
    address: "",
    building: "",
  });

  const { minDate, maxDate } = useMemo(() => getStoreDateRange(), []);

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!customerInfo.name.trim()) {
      alert("お名前を入力してください");
      return false;
    }
    if (!customerInfo.email.trim()) {
      alert("メールアドレスを入力してください");
      return false;
    }
    if (!customerInfo.phone.trim()) {
      alert("電話番号を入力してください");
      return false;
    }
    if (!customerInfo.zipCode.trim()) {
      alert("郵便番号を入力してください");
      return false;
    }
    if (!customerInfo.prefecture) {
      alert("都道府県を選択してください");
      return false;
    }
    if (!customerInfo.city.trim()) {
      alert("市区町村を入力してください");
      return false;
    }
    if (!customerInfo.address.trim()) {
      alert("番地を入力してください");
      return false;
    }
    if (!paymentMethod) {
      alert("支払い方法を選択してください");
      return false;
    }
    if (paymentMethod === "cash-store" && !storeVisitDate) {
      alert("来店予定日を選択してください");
      return false;
    }
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customerInfo,
          paymentMethod,
          total,
          storeVisitDate: paymentMethod === "cash-store" ? storeVisitDate : undefined,
        }),
      });

      if (response.ok) {
        clearCart();
        router.push(`/store/order-complete?method=${paymentMethod}`);
      } else {
        const errorData = await response.json();
        alert(`注文処理中にエラーが発生しました: ${errorData.error}`);
      }
    } catch (error) {
      console.error("エラー:", error);
      alert("注文処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0 && !isCheckout) {
    return (
      <section
        className="relative w-screen bg-gradient-to-b from-[#f7ebd3] via-[#f1ddb5] to-[#e8c98f] px-4"
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          paddingTop: `${pageSpacing.top}px`,
          paddingBottom: `${pageSpacing.bottom}px`,
        }}
      >
        <div className="mx-auto max-w-[76rem]">
          <header className="text-center mb-12">
            <h1
              className={`font-semibold text-[#2f1b0f] ${headingFont.className}`}
              style={{ fontSize: `min(${menuHeadingSize.base}px, max(2rem, 4vw))` }}
            >
              Cart
            </h1>
          </header>

          <div className={`${bodySerif.className} mx-auto w-full max-w-[40rem] text-center space-y-4`}>
            <p className="text-xl font-semibold text-[#2f1b0f]">カートは空です</p>
            <p className="text-sm text-[#4a3121]">商品ページで「カートに入れる」を押すとここに表示されます。</p>
            <Link
              href="/store"
              className="inline-flex items-center justify-center rounded-full border border-[#2f1b0f] px-6 py-2 text-sm text-[#2f1b0f] transition hover:bg-[#f6f1e7]"
            >
              オンラインストアへ戻る
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-screen bg-gradient-to-b from-[#f7ebd3] via-[#f1ddb5] to-[#e8c98f] px-4"
      style={{
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        paddingTop: `${pageSpacing.top}px`,
        paddingBottom: `${pageSpacing.bottom}px`,
      }}
    >
      <div className="mx-auto max-w-4xl">
        {!isCheckout ? (
          <>
            <header className="text-center mb-12">
              <h1
                className={`font-semibold text-[#2f1b0f] ${headingFont.className}`}
                style={{ fontSize: `min(${menuHeadingSize.base}px, max(2rem, 4vw))` }}
              >
                Cart
              </h1>
            </header>

            <div className={`${bodySerif.className} space-y-6 mb-12`}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-6 bg-white rounded-lg border border-[#2f1b0f]"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded bg-white flex-shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-contain p-1" sizes="80px" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-[#2f1b0f]">{item.name}</h3>
                    <p className="text-[#4a3121] mt-2">
                      {formatYen(item.price)} × {item.quantity}
                    </p>
                    <p className="font-semibold text-[#2f1b0f] mt-2">
                      小計: {formatYen(item.price * item.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      removeFromCart(item.id);
                      setItems(getCartItems());
                    }}
                    className="px-4 py-2 bg-red-200 text-red-800 rounded hover:bg-red-300 transition"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>

            <div className={`${bodySerif.className} text-right mb-12`}>
              <p className="text-2xl font-semibold text-[#2f1b0f]">
                合計: {formatYen(total)}
              </p>
            </div>

            <div className="flex gap-4 mb-12">
              <Link
                href="/store"
                className="flex-1 py-4 bg-white border-2 border-[#2f1b0f] text-[#2f1b0f] font-semibold rounded-full hover:brightness-95 transition text-center"
              >
                買い物を続ける
              </Link>
              <button
                onClick={() => setIsCheckout(true)}
                className="flex-1 py-4 bg-[#2f1b0f] text-white font-semibold rounded-full hover:brightness-110 transition"
              >
                チェックアウト
              </button>
            </div>
          </>
        ) : (
          <>
            <header className="text-center mb-12">
              <h1
                className={`font-semibold text-[#2f1b0f] ${headingFont.className}`}
                style={{ fontSize: `min(${menuHeadingSize.base}px, max(2rem, 4vw))` }}
              >
                Order
              </h1>
            </header>

            <div className={`${bodySerif.className} bg-white p-8 rounded-lg border border-[#2f1b0f]`}>
              <h2 className="text-2xl font-semibold text-[#2f1b0f] mb-6">顧客情報</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    お名前 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleInputChange}
                    placeholder="山田太郎"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    メールアドレス <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    電話番号 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={customerInfo.phone}
                    onChange={handleInputChange}
                    placeholder="090-1234-5678"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    郵便番号 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={customerInfo.zipCode}
                    onChange={handleInputChange}
                    placeholder="123-4567"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    都道府県 <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="prefecture"
                    value={customerInfo.prefecture}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  >
                    <option value="">選択してください</option>
                    {prefectures.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    市区町村 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={customerInfo.city}
                    onChange={handleInputChange}
                    placeholder="東京都渋谷区"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    番地 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={customerInfo.address}
                    onChange={handleInputChange}
                    placeholder="1-2-3"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2f1b0f] mb-2">
                    建物名・部屋番号
                  </label>
                  <input
                    type="text"
                    name="building"
                    value={customerInfo.building}
                    onChange={handleInputChange}
                    placeholder="101号室"
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-[#2f1b0f] mb-6 mt-8">支払い方法</h2>

              <div className="space-y-4 mb-8">
                <label className="flex items-start p-6 border-2 border-[#2f1b0f] rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="bank-transfer"
                    checked={paymentMethod === "bank-transfer"}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-5 h-5 mt-1 flex-shrink-0"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-lg text-[#2f1b0f]">銀行振込</p>
                    <p className="text-sm text-[#4a3121] mt-2">
                      注文後にメールで振込先口座情報をお知らせします。ご入金確認後に商品を発送いたします。
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-6 border-2 border-[#2f1b0f] rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="cash-store"
                    checked={paymentMethod === "cash-store"}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-5 h-5 mt-1 flex-shrink-0"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-lg text-[#2f1b0f]">来店時にお支払い（現金）</p>
                    <p className="text-sm text-[#4a3121] mt-2">
                      ご来店時に現金でお支払いください。商品はご来店予定日に合わせて用意いたします。
                    </p>
                  </div>
                </label>
              </div>

              {paymentMethod === "cash-store" && (
                <div className="mb-8 p-6 bg-[#f7ebd3] rounded-lg border border-[#2f1b0f]">
                  <h3 className="text-lg font-semibold text-[#2f1b0f] mb-4">来店予定日を選択</h3>
                  <p className="text-sm text-[#4a3121] mb-4">
                    ※ 注文日から2週間〜30日の営業日（木〜日）のみ選択可能です。定休日は月〜水です。
                  </p>
                  <input
                    type="date"
                    value={storeVisitDate}
                    onChange={(e) => setStoreVisitDate(e.target.value)}
                    min={minDate}
                    max={maxDate}
                    className="w-full px-4 py-2 border border-[#2f1b0f] rounded text-[#2f1b0f]"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setIsCheckout(false)}
                  className="flex-1 py-4 bg-white border-2 border-[#2f1b0f] text-[#2f1b0f] font-semibold rounded-full hover:brightness-95 transition"
                >
                  戻る
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-[#2f1b0f] text-white font-semibold rounded-full hover:brightness-110 transition disabled:opacity-50"
                >
                  {isLoading ? "処理中..." : "注文する"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
