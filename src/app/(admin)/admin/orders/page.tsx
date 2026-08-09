import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { Heading } from "@/components/ui/Primitives";
import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { getLocations } from "@/lib/site-settings";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Shipment,
  ShopOrder,
  ShopOrderItem,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Shop orders — the website's fulfilment view of a MyGymDesk sale.
 *
 * MyGymDesk owns the money, the invoice and the stock. This screen owns what
 * still has to happen physically: pack it, hand it over, or get it on a
 * courier. Reads run as the signed-in admin so RLS enforces the gate a second
 * time, independently of the layout.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return null;

  const params = await searchParams;
  const one = (key: string) => {
    const v = params[key];
    return typeof v === "string" && v ? v : undefined;
  };

  const status = one("status");
  const fulfilment = one("fulfilment");
  const branch = one("branch");
  const oversold = one("oversold") === "1";

  const supabase = await getServerSupabase();

  let orders: ShopOrder[] = [];
  let items: ShopOrderItem[] = [];
  let shipments: Shipment[] = [];

  if (supabase) {
    let query = supabase
      .from("shop_orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(200);

    if (status) query = query.eq("status", status);
    if (fulfilment) query = query.eq("fulfilment", fulfilment);
    if (branch) query = query.eq("location_slug", branch);
    if (oversold) query = query.eq("oversold", true);

    const { data } = await query;
    orders = (data ?? []) as ShopOrder[];

    // Two follow-up reads rather than nested embeds: the mirror has two
    // foreign keys into shop_orders and PostgREST would need a disambiguating
    // hint for each, which is easy to get subtly wrong on a filtered list.
    if (orders.length) {
      const ids = orders.map((o) => o.id);
      const [{ data: itemRows }, { data: shipRows }] = await Promise.all([
        supabase.from("shop_order_items").select("*").in("order_id", ids),
        supabase.from("shipments").select("*").in("order_id", ids),
      ]);
      items = (itemRows ?? []) as ShopOrderItem[];
      shipments = (shipRows ?? []) as Shipment[];
    }
  }

  const locations = await getLocations();

  return (
    <>
      <div className="mb-6">
        <Heading as="h1" size="sub" className="mb-2">
          Orders
        </Heading>
        <p className="m-0 max-w-[70ch] text-[14px] leading-[1.65] text-muted">
          Shop orders placed on the website. The sale, the GST invoice and the
          stock live in the Member App&rsquo;s back office — this is the
          fulfilment side: pack it, hand it over, or get it on a courier.
        </p>
      </div>

      <OrdersBoard
        orders={orders}
        items={items}
        shipments={shipments}
        locations={locations.map((l) => ({ slug: l.slug, name: l.short_name }))}
        canEdit={canEditSettings(gate.admin)}
        filters={{ status, fulfilment, branch, oversold }}
      />
    </>
  );
}
