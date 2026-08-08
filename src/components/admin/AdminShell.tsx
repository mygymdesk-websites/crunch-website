"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/cn";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { AdminUser } from "@/lib/supabase/types";

/** Nav items. Phase-5 sections are present but visibly parked. */
const NAV = [
  { href: "/admin", label: "Site settings", ready: true },
  { href: "/admin/enquiries", label: "Enquiries", ready: true },
  { href: "/admin/orders", label: "Orders", ready: false },
  { href: "/admin/shipments", label: "Shipments", ready: false },
] as const;

/**
 * Admin chrome — same design tokens as the public site, no separate theme.
 */
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await getBrowserSupabase()?.auth.signOut();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-content flex-wrap items-center gap-4 px-5 py-3.5">
          <Logo href="/admin" />
          <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-accent">
            Admin
          </span>

          <div className="flex-auto" />

          <span className="text-right text-[12px] leading-[1.4] text-muted">
            <span className="block font-semibold text-text">
              {admin.full_name || admin.email}
            </span>
            <span className="block capitalize">{admin.role}</span>
          </span>

          <Link
            href="/"
            className="text-[12px] font-semibold uppercase tracking-[.06em]"
          >
            View site
          </Link>

          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer rounded-pill border border-line bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-text transition-colors hover:border-accent"
          >
            Sign out
          </button>
        </div>

        <nav
          aria-label="Admin sections"
          className="no-scrollbar mx-auto flex w-full max-w-content gap-1.5 overflow-x-auto px-5"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-[3px] px-4 py-3 text-[12px] font-bold uppercase tracking-[.08em] transition-colors",
                  active
                    ? "border-accent text-text"
                    : "border-transparent text-muted",
                )}
              >
                {item.label}
                {!item.ready ? (
                  <span className="ml-2 rounded bg-surface2 px-1.5 py-0.5 text-[9px] font-bold tracking-[.1em] text-muted">
                    PHASE 5
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-content px-5 py-9">{children}</main>
    </div>
  );
}
