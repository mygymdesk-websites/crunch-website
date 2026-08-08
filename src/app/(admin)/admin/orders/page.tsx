import { PhaseFivePlaceholder } from "@/components/admin/PhaseFivePlaceholder";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <PhaseFivePlaceholder
      title="Orders"
      summary="Shop orders placed on the website, mirrored from the MyGymDesk sale so the gym can work fulfilment without an MGD login. The tables (shop_orders, shop_order_items) are already migrated and RLS-gated — nothing writes to them until online checkout goes live."
      bullets={[
        "Order list and detail, filtered by location and status",
        "Mark packed, then ready-for-pickup or generate a Shiprocket shipment",
        "Print the courier label and manifest",
        "Mark collected at the desk for pickup orders",
        "Download the GST invoice raised by MyGymDesk",
      ]}
      dependsOn="MyGymDesk endpoints website-shop-order-create and website-shop-order (PRD §3, Track A · A2), plus Shiprocket credentials."
    />
  );
}
