import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutView } from "@/components/shop/CheckoutView";
import { Container, Heading } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your Crunch Fitness shop order and choose pickup or delivery.",
  alternates: { canonical: "/checkout" },
  // A cart is per-visitor and has no business in an index.
  robots: { index: false, follow: true },
};

const STEPS = [
  { n: "1", label: "Cart", done: true },
  { n: "2", label: "Delivery", done: true },
  { n: "3", label: "Payment", done: false },
  { n: "4", label: "Done", done: false },
];

export default function CheckoutPage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="pt-5 text-[12px] text-muted">
          <nav aria-label="Breadcrumb">
            <Link href="/" className="text-muted">
              /
            </Link>{" "}
            <Link href="/shop" className="text-muted">
              shop
            </Link>{" "}
            <span className="text-text">/checkout</span>
          </nav>
        </Container>

        <Container className="pb-[34px] pt-8">
          <Heading as="h1" size="page" className="mb-[22px]">
            Checkout
          </Heading>
          <ol className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0">
            {STEPS.map((step, index) => (
              <li key={step.n} className="flex items-center gap-[9px]">
                <span
                  aria-hidden="true"
                  className={`grid h-[26px] w-[26px] place-items-center rounded-full border text-[12px] font-bold ${
                    step.done
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-transparent text-muted"
                  }`}
                >
                  {step.n}
                </span>
                <span
                  className={`text-[12px] font-semibold uppercase tracking-[.06em] ${
                    step.done ? "text-text" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 ? (
                  <span aria-hidden="true" className="h-px w-[26px] bg-line" />
                ) : null}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Container className="pt-9">
        <CheckoutView />
      </Container>
    </>
  );
}
