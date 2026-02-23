import { OrdersClient } from "./orders-client";

export default function DashboardOrdersPage() {
  // Server component wrapper - actual logic moved to OrdersClient
  return <OrdersClient />;
}
