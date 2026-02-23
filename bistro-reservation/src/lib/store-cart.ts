export type StoreCartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

const STORE_CART_KEY = "bistro_store_cart_v1";

function isValidCartItem(value: unknown): value is StoreCartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoreCartItem>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    typeof item.image === "string" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export function getCartItems(): StoreCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORE_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCartItem);
  } catch {
    return [];
  }
}

export function saveCartItems(items: StoreCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_CART_KEY, JSON.stringify(items));
}

export function addToCart(
  item: Omit<StoreCartItem, "quantity">,
  quantity: number,
): StoreCartItem[] {
  const qty = Math.max(1, Math.floor(quantity));
  const current = getCartItems();
  const existingIndex = current.findIndex((cartItem) => cartItem.id === item.id);

  if (existingIndex >= 0) {
    const next = [...current];
    next[existingIndex] = {
      ...next[existingIndex],
      quantity: next[existingIndex].quantity + qty,
    };
    saveCartItems(next);
    return next;
  }

  const next = [...current, { ...item, quantity: qty }];
  saveCartItems(next);
  return next;
}

export function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}
