"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/cn";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { AdminUser } from "@/lib/supabase/types";

/**
 * Admin chrome — a persistent left rail on desktop, a drawer below `lg`.
 *
 * Same design tokens as the public site, no separate theme. Icons are inline
 * SVG on `currentColor` rather than a new dependency: four glyphs do not
 * justify an icon package, and inheriting the colour means the active and
 * muted states need no icon-specific styling.
 */

/** Nav items. `ready: false` parks a section with a chip; nothing is parked now. */
const NAV = [
  { href: "/admin", label: "Site settings", ready: true, icon: SlidersIcon },
  { href: "/admin/content", label: "Content", ready: true, icon: ImageIcon },
  { href: "/admin/enquiries", label: "Enquiries", ready: true, icon: InboxIcon },
  { href: "/admin/orders", label: "Orders", ready: true, icon: BagIcon },
  {
    href: "/admin/shipments",
    label: "Shipments",
    ready: true,
    icon: TruckIcon,
  },
] as const;

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await getBrowserSupabase()?.auth.signOut();
    router.refresh();
  }

  // `/admin` would prefix-match every child route, so it is compared exactly.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const rail = (
    <>
      <nav aria-label="Admin sections" className="grid gap-1 p-3">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              // Closing on click rather than on route change also closes the
              // drawer when the destination is the page you are already on.
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-field px-3 py-2.5 text-[12px] font-bold uppercase tracking-[.08em] transition-colors",
                active
                  ? "bg-accent-soft text-text"
                  : "text-muted hover:text-text",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]",
                  active ? "bg-accent text-accent-ink" : "bg-surface2",
                )}
              >
                <Icon />
              </span>
              <span className="min-w-0 flex-auto truncate">{item.label}</span>
              {!item.ready ? (
                <span className="shrink-0 rounded bg-surface2 px-1.5 py-0.5 text-[9px] font-bold tracking-[.1em] text-muted">
                  PHASE 5
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Identity and the way out, pinned to the bottom of the rail. */}
      <div className="mt-auto border-t border-line p-3">
        <div className="mb-3 px-1">
          <span className="block truncate text-[13px] font-semibold text-text">
            {admin.full_name || admin.email}
          </span>
          <span className="block text-[11px] capitalize text-muted">
            {admin.role}
          </span>
        </div>

        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="mb-2 flex items-center gap-2 rounded-field px-3 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted transition-colors hover:text-text"
        >
          <span aria-hidden="true" className="grid h-4 w-4 place-items-center">
            <ExternalIcon />
          </span>
          View site
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="w-full cursor-pointer rounded-pill border border-line bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-text transition-colors hover:border-accent"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop rail — persistent, full height, its own scroll. */}
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
          <Logo href="/admin" />
          <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-accent">
            Admin
          </span>
        </div>
        {rail}
      </aside>

      <div className="min-w-0">
        {/* Mobile bar — the rail collapses to this below `lg`. */}
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Logo href="/admin" />
          <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-accent">
            Admin
          </span>
          <div className="flex-auto" />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            title="Menu"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="admin-drawer"
            className="grid h-[38px] w-11 shrink-0 cursor-pointer place-items-center gap-1 rounded-pill border border-line bg-transparent px-3 text-text"
          >
            <span aria-hidden="true" className="block h-0.5 w-[18px] bg-text" />
            <span aria-hidden="true" className="block h-0.5 w-[18px] bg-text" />
            <span aria-hidden="true" className="block h-0.5 w-[18px] bg-text" />
          </button>
        </header>

        {menuOpen ? (
          <div
            id="admin-drawer"
            className="flex flex-col border-b border-line bg-surface lg:hidden"
          >
            {rail}
          </div>
        ) : null}

        <main className="w-full px-5 py-9 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons. 16px, stroke-only, inheriting colour so the active state needs no
// special-casing.
// ---------------------------------------------------------------------------

const SVG = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SlidersIcon() {
  return (
    <svg {...SVG}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg {...SVG}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-5 4 4 3-3 4 4" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg {...SVG}>
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M5 5h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg {...SVG}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg {...SVG}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg {...SVG} width={13} height={13}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8 8" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}
