/**
 * Types for the client's Supabase project.
 *
 * Hand-written to match supabase/migrations/*. Once the project exists, these
 * can be replaced with `supabase gen types typescript` output — the shapes are
 * deliberately named the same way the generator names them.
 */

export type AdminRole = "owner" | "manager" | "staff";

export type EnquirySource =
  | "contact_form"
  | "trial_modal"
  | "appointment_form"
  | "packages_enquiry"
  | "other";

export type MgdSyncStatus = "pending" | "sent" | "failed" | "skipped";

export type FulfilmentType = "pickup" | "courier";

export type ShopOrderStatus =
  | "placed"
  | "packed"
  | "shipped"
  | "delivered"
  | "ready_for_pickup"
  | "collected";

export type ShipmentStatus =
  | "pending"
  | "created"
  | "awb_assigned"
  | "pickup_scheduled"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "rto_initiated"
  | "rto_delivered"
  | "cancelled"
  | "exception";

/** One row of the per-day opening-hours breakdown. */
export interface OpeningHoursRow {
  label: string;
  value: string;
}

export interface LocationSocials {
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  youtube?: string | null;
  website?: string | null;
}

/**
 * The public projection of a location — exactly the columns exposed by the
 * `site_settings_public` view. This is what every public page consumes.
 */
export interface SiteLocation {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  transit_note: string | null;
  phone: string;
  whatsapp: string | null;
  email: string;
  hours_summary: string;
  hours: OpeningHoursRow[];
  closed_note: string | null;
  map_embed_url: string | null;
  map_link_url: string | null;
  latitude: number | null;
  longitude: number | null;
  socials: LocationSocials;
  /**
   * The MyGymDesk branch UUID this location maps to. Null until configured —
   * readers then fall back to an UNFILTERED API call rather than guessing.
   */
  mgd_location_id: string | null;
  is_default: boolean;
  display_order: number;
  hero_image_url: string | null;
}

/** The full row, including presentation state. Admin surfaces only. */
export interface SiteLocationAdmin extends SiteLocation {
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  message: string | null;
  location_id: string | null;
  location_slug: string | null;
  source: EnquirySource;
  source_page: string | null;
  referer: string | null;
  whatsapp_opt_in: boolean;
  mgd_sync_status: MgdSyncStatus;
  mgd_lead_id: string | null;
  mgd_synced_at: string | null;
  mgd_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryInsert {
  name: string;
  phone: string;
  email?: string | null;
  interest?: string | null;
  message?: string | null;
  location_id?: string | null;
  location_slug?: string | null;
  source: EnquirySource;
  source_page?: string | null;
  referer?: string | null;
  whatsapp_opt_in?: boolean;
}

export interface ShippingAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

export interface ShopOrder {
  id: string;
  order_number: string;
  mgd_sale_id: string | null;
  mgd_invoice_id: string | null;
  payment_gateway: string;
  payment_order_id: string | null;
  payment_capture_id: string | null;
  customer_user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_gstin: string | null;
  location_id: string | null;
  location_slug: string | null;
  fulfilment: FulfilmentType;
  status: ShopOrderStatus;
  shipping_address: ShippingAddress | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  promo_code: string | null;
  notes: string | null;
  placed_at: string;
  packed_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  mgd_product_id: string | null;
  sku: string | null;
  brand: string | null;
  name: string;
  variant: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  shiprocket_order_id: string | null;
  shiprocket_shipment_id: string | null;
  awb: string | null;
  courier: string | null;
  tracking_url: string | null;
  label_url: string | null;
  manifest_url: string | null;
  status: ShipmentStatus;
  status_detail: string | null;
  status_log: unknown[];
  shipped_at: string | null;
  delivered_at: string | null;
  expected_delivery_at: string | null;
  created_at: string;
  updated_at: string;
}
