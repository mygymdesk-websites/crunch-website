import { PhaseFivePlaceholder } from "@/components/admin/PhaseFivePlaceholder";

export const dynamic = "force-dynamic";

export default function AdminShipmentsPage() {
  return (
    <PhaseFivePlaceholder
      title="Shipments"
      summary="Shiprocket tracking for courier orders. The shipments table is migrated and RLS-gated, including an append-only status_log so a courier's raw payloads are kept even when their status vocabulary changes."
      bullets={[
        "Tracking board by status: created, AWB assigned, in transit, delivered, RTO",
        "AWB, courier and tracking link per order",
        "Status synced from Shiprocket's webhook, with a poll as fallback",
        "Exceptions and returns surfaced rather than buried",
      ]}
      dependsOn="Shiprocket account credentials (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD) and the Phase 5 order flow that creates the shipment."
    />
  );
}
