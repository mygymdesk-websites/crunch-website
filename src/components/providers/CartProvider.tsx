"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MgdProduct } from "@/lib/mgd/types";
import { CART_STORAGE_KEY } from "@/lib/site";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * What the cart remembers about a product.
 *
 * A SNAPSHOT taken at add-time, not a live lookup. The cart drawer is global —
 * it renders on every page — and product data now comes from MyGymDesk, which
 * only the server may call. Snapshotting keeps the drawer working without
 * fetching the whole catalogue on every page view.
 *
 * The price here is for DISPLAY only. Checkout re-resolves every price from
 * MyGymDesk server-side (Phase 5), and `product.price` is the all-in charged
 * amount, so a stale snapshot can never become the amount charged.
 */
export interface CartSnapshot {
  name: string;
  brand: string | null;
  size: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
}

export interface CartLine {
  productId: string;
  qty: number;
  snapshot: CartSnapshot;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (product: MgdProduct, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Per-line cap. 99 is the API's own bound (`invalid_quantity` above it), so the
 * cart refuses what checkout would refuse rather than letting someone build a
 * basket that cannot be ordered.
 */
const MAX_QTY = 99;

function snapshotOf(product: MgdProduct): CartSnapshot {
  return {
    name: product.name,
    brand: product.brand,
    size: product.size,
    price: product.price,
    currency: product.currency,
    imageUrl: product.imageUrl,
  };
}

function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry): CartLine[] => {
      if (!entry || typeof entry !== "object") return [];
      const line = entry as Partial<CartLine>;
      if (typeof line.productId !== "string") return [];
      if (!Number.isFinite(line.qty)) return [];
      // Lines written before the live-product swap have no snapshot; drop them
      // rather than render a cart row with no name or price.
      if (!line.snapshot || typeof line.snapshot.name !== "string") return [];

      return [
        {
          productId: line.productId,
          qty: Math.min(Math.max(1, Math.trunc(line.qty as number)), MAX_QTY),
          snapshot: line.snapshot as CartSnapshot,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStoredCart);
  const [isOpen, setOpen] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or disabled; the cart still works for this session.
    }
  }, [lines, hydrated]);

  const add = useCallback((product: MgdProduct, qty = 1) => {
    // Both add buttons already disable on out-of-stock; this is the choke point
    // that makes it true regardless of which surface calls in. Ordering one is
    // a 422 at checkout, so keeping it out of the cart is the honest failure.
    if (product.stockStatus === "out_of_stock") return;

    setLines((current) => {
      const existing = current.find((l) => l.productId === product.id);
      if (existing) {
        return current.map((l) =>
          l.productId === product.id
            ? // Refresh the snapshot on re-add so a price change is picked up.
              {
                ...l,
                qty: Math.min(l.qty + qty, MAX_QTY),
                snapshot: snapshotOf(product),
              }
            : l,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          qty: Math.min(qty, MAX_QTY),
          snapshot: snapshotOf(product),
        },
      ];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((current) =>
      qty <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) =>
            l.productId === productId
              ? { ...l, qty: Math.min(qty, MAX_QTY) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      add,
      setQty,
      remove,
      clear,
      hydrated,
    }),
    [lines, isOpen, add, setQty, remove, clear, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
