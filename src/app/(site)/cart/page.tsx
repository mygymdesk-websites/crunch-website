import { permanentRedirect } from "next/navigation";

/**
 * /cart and /checkout are one screen in the design — line items, fulfilment
 * choice and summary all live together. Keeping /cart as a redirect means the
 * obvious URL works and there is only one implementation to maintain.
 */
export default function CartPage() {
  permanentRedirect("/checkout");
}
