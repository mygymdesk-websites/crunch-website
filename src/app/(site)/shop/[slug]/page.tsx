import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/shop/ProductDetail";
import { Container } from "@/components/ui/Primitives";
import { PRODUCT_FIXTURES, findProductBySlug } from "@/lib/fixtures/products";

export const revalidate = 900;

/** Pre-render every product page — the catalog is small and fully known. */
export function generateStaticParams() {
  return PRODUCT_FIXTURES.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  return {
    title: `${product.name} — ${product.variant}`,
    description: product.description,
    alternates: { canonical: `/shop/${product.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-5 text-[12px] text-muted">
          <nav aria-label="Breadcrumb">
            <Link href="/" className="text-muted">
              /
            </Link>{" "}
            <Link href="/shop" className="text-muted">
              shop
            </Link>{" "}
            <span className="text-text">/{product.slug}</span>
          </nav>
        </Container>
      </section>

      <Container className="py-14">
        <ProductDetail product={product} />
      </Container>
    </>
  );
}
