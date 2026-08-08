import type { Metadata } from "next";

import { ContactForm, ContactSidebar } from "@/components/contact/ContactForm";
import { LocationCards } from "@/components/contact/LocationCards";
import { PageHero } from "@/components/site/PageHero";
import { Container, Eyebrow, Heading } from "@/components/ui/Primitives";
import { CONTACT_FAQS } from "@/lib/fixtures/site-content";
import { getLocations } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call, WhatsApp or drop into Crunch Fitness. Someone is at the desk during all opening hours, at both gyms.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 3600;

export default async function ContactPage() {
  const locations = await getLocations();

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Come in, call, or message us"
        breadcrumb="/contact"
        headingWidth="18ch"
        intro="Someone is at the desk during all opening hours. WhatsApp is usually the fastest way to reach us."
      />

      <Container className="pt-11">
        <div className="grid grid-cols-1 items-start gap-[26px] min-[1220px]:grid-cols-[1fr_360px]">
          <ContactForm />
          <ContactSidebar />
        </div>
      </Container>

      <Container className="pt-16">
        <div className="mb-6">
          <Eyebrow className="mb-2.5">Find us</Eyebrow>
          <Heading className="!text-[clamp(24px,3.4vw,40px)]">
            {locations.length === 2
              ? "Two locations"
              : `${locations.length} locations`}
          </Heading>
        </div>
        <LocationCards />
      </Container>

      <Container className="pt-16">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-10">
          <div>
            <Eyebrow className="mb-2.5">Before you write</Eyebrow>
            <Heading size="sub" className="mb-3.5">
              Answers to the usual questions
            </Heading>
            <p className="m-0 text-[14px] leading-[1.65] text-muted">
              If none of these covers it, the form gets a reply within one
              working day. For anything urgent — a locked locker, a class
              starting in an hour — call the desk.
            </p>
          </div>
          <div className="grid gap-3">
            {CONTACT_FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-[12px] border border-line bg-surface p-[18px]"
              >
                <div className="mb-[7px] text-[14px] font-bold">{faq.q}</div>
                <div className="text-[13px] leading-[1.6] text-muted">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
