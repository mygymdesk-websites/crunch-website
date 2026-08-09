import { ShipmentsBoard } from "@/components/admin/ShipmentsBoard";
import { Heading } from "@/components/ui/Primitives";
import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { isShiprocketConfigured } from "@/lib/shiprocket";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Shipment, ShopOrder } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Shipments — courier orders and their Shiprocket state.
 *
 * Two lists on one screen because they are two halves of one job: courier
 * orders that are packed and still need a shipment, and the shipments that
 * already exist. Splitting them across tabs would hide the queue that actually
 * needs working.
 */
export default async function AdminShipmentsPage() {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return null;

  const supabase = await getServerSupabase();

  let awaiting: ShopOrder[] = [];
  let shipments: Shipment[] = [];
  let orders: ShopOrder[] = [];

  if (supabase) {
    const [{ data: shipRows }, { data: courierOrders }] = await Promise.all([
      supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("shop_orders")
        .select("*")
        .eq("fulfilment", "courier")
        .order("placed_at", { ascending: false })
        .limit(200),
    ]);

    shipments = (shipRows ?? []) as Shipment[];
    orders = (courierOrders ?? []) as ShopOrder[];

    const shipped = new Set(shipments.map((s) => s.order_id));
    // Packed and waiting is the actionable queue. A courier order still at
    // `placed` has not been picked yet, so it is not ready for a label.
    awaiting = orders.filter((o) => !shipped.has(o.id) && o.status === "packed");
  }

  return (
    <>
      <div className="mb-6">
        <Heading as="h1" size="sub" className="mb-2">
          Shipments
        </Heading>
        <p className="m-0 max-w-[70ch] text-[14px] leading-[1.65] text-muted">
          Courier orders and their Shiprocket state. Pack an order first — a
          label is only useful once the parcel exists.
        </p>
      </div>

      <ShipmentsBoard
        awaiting={awaiting}
        shipments={shipments}
        orders={orders}
        canEdit={canEditSettings(gate.admin)}
        shiprocketReady={isShiprocketConfigured()}
      />
    </>
  );
}
