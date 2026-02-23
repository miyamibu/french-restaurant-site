"use client";

import { useEffect, useState } from "react";
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

interface Order {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  zip_code: string;
  prefecture: string;
  city: string;
  address: string;
  building: string | null;
  payment_method: "bank-transfer" | "cash-store";
  items: any[];
  total: number;
  store_visit_date: string | null;
  status: "unconfirmed" | "confirmed" | "shipped";
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  branch_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
}

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  useEffect(() => {
    loadOrders();
    loadBankAccount();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/dashboard/orders", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
      alert("注文一覧の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBankAccount = async () => {
    try {
      const response = await fetch("/api/dashboard/bank-account", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bank account");
      }

      const data = await response.json();
      setBankAccount(data?.id ? data : null);
    } catch (error) {
      console.error("Failed to load bank account:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/dashboard/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order");
      }

      loadOrders();
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("ステータスの更新に失敗しました");
    }
  };

  const shipOrder = async (orderId: string) => {
    try {
      const response = await fetch("/api/dashboard/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        throw new Error("Failed to ship order");
      }

      loadOrders();
      alert("注文を発送しました");
    } catch (error) {
      console.error("Failed to ship order:", error);
      alert("発送処理に失敗しました");
    }
  };

  const saveBankAccount = async () => {
    if (
      !editingBank?.bank_name ||
      !editingBank?.branch_name ||
      !editingBank?.account_type ||
      !editingBank?.account_number ||
      !editingBank?.account_holder
    ) {
      alert("全ての項目を入力してください");
      return;
    }

    try {
      const response = await fetch("/api/dashboard/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBank),
      });

      if (!response.ok) {
        throw new Error("Failed to save bank account");
      }

      setShowBankForm(false);
      setEditingBank(null);
      loadBankAccount();
      alert("銀行情報を保存しました");
    } catch (error) {
      console.error("Failed to save bank account:", error);
      alert("銀行情報の保存に失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      unconfirmed: { label: "未確認", color: "bg-gray-200" },
      confirmed: { label: "確認済み", color: "bg-yellow-200" },
      shipped: { label: "発送", color: "bg-green-200" },
    };
    const s = statuses[status] || statuses.unconfirmed;
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${s.color}`}>{s.label}</span>;
  };

  if (isLoading) {
    return (
      <section className="p-8 bg-gray-50 min-h-screen">
        <div className="text-center">読み込み中...</div>
      </section>
    );
  }

  return (
    <section className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1
            className={`${headingFont.className} text-4xl font-bold text-[#2f1b0f] mb-4`}
          >
            注文管理ダッシュボード
          </h1>
        </header>

        {/* 銀行情報セクション */}
        <div className={`${bodySerif.className} bg-white p-6 rounded-lg border border-gray-300 mb-12`}>
          <h2 className="text-2xl font-semibold text-[#2f1b0f] mb-4">銀行振込先情報</h2>

          {!showBankForm ? (
            <>
              {bankAccount ? (
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <p>
                    <strong>銀行:</strong> {bankAccount.bank_name}
                  </p>
                  <p>
                    <strong>支店:</strong> {bankAccount.branch_name}
                  </p>
                  <p>
                    <strong>口座種別:</strong> {bankAccount.account_type}
                  </p>
                  <p>
                    <strong>口座番号:</strong> {bankAccount.account_number}
                  </p>
                  <p>
                    <strong>口座名義:</strong> {bankAccount.account_holder}
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 mb-4">銀行情報が未設定です</p>
              )}
              <button
                onClick={() => {
                  setEditingBank(
                    bankAccount || {
                      id: "",
                      bank_name: "",
                      branch_name: "",
                      account_type: "",
                      account_number: "",
                      account_holder: "",
                    }
                  );
                  setShowBankForm(true);
                }}
                className="px-4 py-2 bg-[#2f1b0f] text-white rounded hover:brightness-110 transition"
              >
                {bankAccount ? "編集" : "追加"}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#2f1b0f] mb-1">
                  銀行名
                </label>
                <input
                  type="text"
                  value={editingBank?.bank_name || ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank!,
                      bank_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2f1b0f] mb-1">
                  支店名
                </label>
                <input
                  type="text"
                  value={editingBank?.branch_name || ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank!,
                      branch_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2f1b0f] mb-1">
                  口座種別
                </label>
                <select
                  value={editingBank?.account_type || ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank!,
                      account_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">選択してください</option>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2f1b0f] mb-1">
                  口座番号
                </label>
                <input
                  type="text"
                  value={editingBank?.account_number || ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank!,
                      account_number: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2f1b0f] mb-1">
                  口座名義
                </label>
                <input
                  type="text"
                  value={editingBank?.account_holder || ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank!,
                      account_holder: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveBankAccount}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:brightness-110 transition"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowBankForm(false);
                    setEditingBank(null);
                  }}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:brightness-110 transition"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 注文一覧セクション */}
        <div className={`${bodySerif.className} bg-white p-6 rounded-lg border border-gray-300`}>
          <h2 className="text-2xl font-semibold text-[#2f1b0f] mb-4">注文一覧</h2>

          {orders.length === 0 ? (
            <p className="text-gray-600 text-center py-8">注文はまだありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left font-semibold text-[#2f1b0f]">
                      注文日時
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#2f1b0f]">
                      顧客名
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#2f1b0f]">
                      支払い方法
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#2f1b0f]">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#2f1b0f]">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#2f1b0f]">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(order.created_at).toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-[#2f1b0f]">{order.customer_name}</div>
                        <div className="text-xs text-gray-600">{order.email}</div>
                        <div className="text-xs text-gray-600">{order.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.payment_method === "bank-transfer"
                          ? "銀行振込"
                          : "来店時支払い"}
                        {order.payment_method === "cash-store" && order.store_visit_date && (
                          <div className="text-xs text-gray-600 mt-1">
                            来店日: {order.store_visit_date}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        ¥{order.total.toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm space-y-2">
                        <div>
                          {order.status === "unconfirmed" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "confirmed")
                              }
                              className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:brightness-110 transition"
                            >
                              確認済みに
                            </button>
                          )}
                          {order.status === "confirmed" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "shipped")
                              }
                              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:brightness-110 transition"
                            >
                              発送待機中
                            </button>
                          )}
                          {order.status === "shipped" && (
                            <button
                              onClick={() => shipOrder(order.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:brightness-110 transition"
                            >
                              発送完了・削除
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const details = `
顧客情報:
- 名前: ${order.customer_name}
- メール: ${order.email}
- 電話: ${order.phone}
- 住所: ${order.zip_code} ${order.prefecture}${order.city}${order.address}${order.building || ""}

商品:
${order.items.map((item: any) => `- ${item.name} × ${item.quantity}: ¥${(item.price * item.quantity).toLocaleString("ja-JP")}`).join("\n")}

合計: ¥${order.total.toLocaleString("ja-JP")}
`;
                            alert(details);
                          }}
                          className="block px-3 py-1 bg-gray-500 text-white rounded text-xs hover:brightness-110 transition"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
