"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/components/providers/CartProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { cn } from "@/lib/cn";
import { NAV_LINKS } from "@/lib/site";
import { LocationMenu } from "./LocationMenu";
import { Logo } from "./Logo";

/**
 * The sticky site header.
 *
 * The design switches to a hamburger at 1220px using `matchMedia` in JS. This
 * port does the same switch in CSS (`min-[1220px]:`), which renders the exact
 * same design without a server/client mismatch or a layout jump on first
 * paint — the reason the design tool reached for JS was that it had no
 * stylesheet to put a media query in.
 */
export function Header() {
  const pathname = usePathname();
  const { icon, toggleTheme } = useTheme();
  const { count, openCart, hydrated } = useCart();
  const { openTrial } = useTrialModal();
  const [menuOpen, setMenuOpen] = useState(false);

  // The mobile menu closes when a link inside it is followed. Doing it on the
  // click rather than by watching `pathname` avoids a cascading render, and
  // also closes the menu when the destination is the current page.
  const closeMenu = () => setMenuOpen(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-[60] border-b border-line bg-surface">
      <div className="mx-auto flex h-[68px] w-full max-w-content items-center gap-3 px-4">
        <Logo />

        {/* Wide navigation */}
        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-auto flex-nowrap gap-[18px] ml-3.5 min-[1220px]:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap text-[12px] font-semibold uppercase tracking-[.08em]",
                isActive(link.href) && "text-accent",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Spacer so the right-hand cluster stays right-aligned on narrow. */}
        <div className="flex-auto min-[1220px]:hidden" />

        <LocationMenu variant="pill" className="hidden min-[1220px]:block" />

        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle theme"
          aria-label="Toggle light or dark theme"
          className="h-[38px] w-[38px] shrink-0 cursor-pointer rounded-full border border-line bg-transparent text-[14px] text-text transition-colors hover:border-accent"
        >
          <span aria-hidden="true">{icon}</span>
        </button>

        <button
          type="button"
          onClick={openCart}
          title="Cart"
          aria-label={`Cart${hydrated && count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ", empty"}`}
          className="relative h-[38px] w-[38px] shrink-0 cursor-pointer rounded-full border border-line bg-transparent text-[15px] leading-none text-text transition-colors hover:border-accent"
        >
          <span aria-hidden="true">🛒</span>
          {/* Rendered only after hydration: the server cannot know what is in
              the visitor's localStorage cart. */}
          {hydrated && count > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-pill bg-accent px-1 text-[10px] font-bold text-accent-ink">
              {count}
            </span>
          ) : null}
        </button>

        <Link
          href="/account"
          className="hidden shrink-0 whitespace-nowrap text-[13px] font-semibold tracking-[.03em] min-[1220px]:block"
        >
          Sign In
        </Link>

        <button
          type="button"
          onClick={() => openTrial()}
          className="hidden shrink-0 cursor-pointer whitespace-nowrap rounded-pill border-0 bg-accent px-5 py-[11px] text-[12px] font-bold uppercase tracking-[.08em] text-accent-ink transition-[filter] hover:brightness-[1.08] min-[1220px]:block"
        >
          Book Free Trial
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          title="Menu"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="grid h-[38px] w-11 shrink-0 cursor-pointer place-items-center gap-1 rounded-pill border border-line bg-transparent px-3 text-text min-[1220px]:hidden"
        >
          <span aria-hidden="true" className="block h-0.5 w-[18px] bg-text" />
          <span aria-hidden="true" className="block h-0.5 w-[18px] bg-text" />
          <span aria-hidden="true" className="block h-0.5 w-[18px] bg-text" />
        </button>
      </div>

      {/* Narrow: the location strip lives under the bar, always visible. */}
      <LocationMenu variant="bar" className="min-[1220px]:hidden" />

      {menuOpen ? (
        <div
          id="mobile-menu"
          className="border-t border-line bg-surface px-4 pb-[22px] pt-4 min-[1220px]:hidden"
        >
          <nav aria-label="Mobile" className="mb-4 grid gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "border-b border-line py-3 text-[15px] font-semibold uppercase tracking-[.05em]",
                  isActive(link.href) && "text-accent",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/account"
              onClick={closeMenu}
              className={cn(
                "py-3 text-[15px] font-semibold uppercase tracking-[.05em]",
                isActive("/account") && "text-accent",
              )}
            >
              Sign In
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              openTrial();
            }}
            className="w-full cursor-pointer rounded-pill border-0 bg-accent px-5 py-[15px] text-[13px] font-bold uppercase tracking-[.08em] text-accent-ink"
          >
            Book Free Trial
          </button>
        </div>
      ) : null}
    </header>
  );
}
