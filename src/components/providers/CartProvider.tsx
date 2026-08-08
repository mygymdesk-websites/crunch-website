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

import { PRODUCT_FIXTURES, type ProductFixture } from "@/lib/fixtures/products";
import { CART_STORAGE_KEY } from "@/lib/site";
import { useHydrated } from "@/lib/use-hydrated";

export interface CartLine {
  productId: string;
  qty: number;
}

export interface ResolvedCartLine extends CartLine {
  product: ProductFixture;
  unitPrice: number;
  lineTotal: number;
  /** Stock at the currently selected location. */
  stock: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Resolve lines against the catalog and a location's stock. */
  resolve: (locationSlug: string) => ResolvedCartLine[];
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Per-line cap, matching the design's quantity stepper. */
const MAX_QTY = 10;

/**
 * Cart state, held in localStorage.
 *
 * Phase 1 is UI only — nothing is charged and no order is written. The shape
 * here (product id + qty, priced at render time from the catalog) is the same
 * one Phase 5 needs, because the server re-resolves every price from MyGymDesk
 * at checkout regardless. A client-side price is a display convenience, never
 * an input to a payment.
 */
/**
 * Read and sanitise the stored cart.
 *
 * Runs in a `useState` initialiser, so it happens during the first client
 * render rather than in an effect. Nothing renders cart contents until
 * `hydrated` is true, so the server and hydration passes still produce
 * identical markup.
 */
function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (l): l is CartLine =>
          !!l &&
          typeof (l as CartLine).productId === "string" &&
          Number.isFinite((l as CartLine).qty),
      )
      // Drop lines for products that no longer exist.
      .filter((l) => PRODUCT_FIXTURES.some((p) => p.id === l.productId))
      .map((l) => ({
        productId: l.productId,
        qty: Math.min(Math.max(1, Math.trunc(l.qty)), MAX_QTY),
      }));
  } catch {
    // Corrupt or unavailable storage — start with an empty cart.
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

  const add = useCallback((productId: string, qty = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === productId);
      if (existing) {
        return current.map((l) =>
          l.productId === productId
            ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) }
            : l,
        );
      }
      return [...current, { productId, qty: Math.min(qty, MAX_QTY) }];
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

  const resolve = useCallback(
    (locationSlug: string): ResolvedCartLine[] =>
      lines.flatMap((line) => {
        const product = PRODUCT_FIXTURES.find((p) => p.id === line.productId);
        if (!product) return [];
        return [
          {
            ...line,
            product,
            unitPrice: product.price,
            lineTotal: product.price * line.qty,
            stock: product.stockBySlug[locationSlug] ?? 0,
          },
        ];
      }),
    [lines],
  );

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
      resolve,
      hydrated,
    }),
    [lines, isOpen, add, setQty, remove, clear, resolve, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
