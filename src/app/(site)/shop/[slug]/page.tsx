import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/shop/ProductDetail";
import { Container } from "@/components/ui/Primitives";
import { getProducts } from "@/lib/content";
import { findProductBySlug } from "@/lib/shop";
import { LOCATION_STORAGE_KEY } from "@/lib/site";
import { resolveLocation } from "@/lib/site-settings";

export const revalidate = 900;

/**
 * Resolve a product slug against the live catalogue for the visitor's gym.
 *
 * No `generateStaticParams`: the catalogue is live and location-scoped, and
 * the whole site renders per-request anyway (the location cookie is read in
 * the root layout). The catalogue read is cached for 15 minutes, so this
 * costs no extra MyGymDesk call.
 */
async function loadProduct(slug: string) {
  const cookieStore = await cookies();
  const location = await resolveLocation(
    cookieStore.get(LOCATION_STORAGE_KEY)?.value,
  );
  const { data } = await getProducts(location);
  return findProductBySlug(data.products, slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Product not found" };

  const name = [product.name, product.size].filter(Boolean).join(" — ");

  return {
    title: name,
    description:
      product.description ??
      `${product.name} from ${product.brand ?? "Crunch Fitness"}, stocked at the gym.`,
    alternates: { canonical: `/shop/${slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
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
            <span className="text-text">/{slug}</span>
          </nav>
        </Container>
      </section>

      <Container className="py-14">
        <ProductDetail product={product} />
      </Container>
    </>
  );
}
