/**
 * Policy documents.
 *
 * PLACEHOLDER BODIES. The copy below is the approved design's placeholder
 * text — it reads correctly and is structurally complete, but it has NOT been
 * reviewed by the client's lawyer. Section 7 of the PRD puts legal copy on the
 * client; these must be replaced (or signed off) before launch. See HANDOFF.md.
 *
 * Kept as structured data rather than MDX because every one of the four
 * documents renders through a single template: numbered sections, paragraphs,
 * dashed lists and an optional accent callout. Structure means the table of
 * contents, anchor ids and "also read" cards all generate themselves.
 */

export interface PolicySection {
  title: string;
  paragraphs: string[];
  /** Dashed bullet list. */
  list?: string[];
  /** Accent-bordered callout at the end of the section. */
  note?: string;
}

export interface PolicyDoc {
  slug: string;
  label: string;
  title: string;
  /** One-line summary, used on the "also read" cards. */
  blurb: string;
  intro: string;
  /** DD/MM/YYYY. */
  updated: string;
  sections: PolicySection[];
}

export const POLICY_DOCS: PolicyDoc[] = [
  {
    slug: "refund",
    label: "Refund Policy",
    title: "Refund Policy",
    blurb:
      "Memberships, class bookings and shop orders — when money comes back.",
    intro:
      "What we refund, what we do not, and how long it takes. Written to be read once, not argued over later.",
    updated: "01/07/2026",
    sections: [
      {
        title: "Memberships",
        paragraphs: [
          "Memberships are non-transferable and tied to the person named on the invoice.",
        ],
        list: [
          "Cancel within 7 days of purchase and before your first check-in for a full refund.",
          "After the first check-in, Quarterly and Annual plans are refunded pro-rata for unused whole months, less a ₹500 administration fee.",
          "Monthly plans are not refunded mid-term. Skip the next payment and the plan lapses at the end of the paid period.",
          "Day passes are not refundable once used.",
        ],
      },
      {
        title: "Class bookings",
        paragraphs: [
          "Group classes are capped at twenty people, so a late cancellation costs someone else a place.",
        ],
        list: [
          "Cancel more than 4 hours before the class for a full refund to the original payment method.",
          "Inside 4 hours, or a no-show, the class fee is not refunded.",
          "If we cancel a class — instructor illness, equipment failure — you are refunded in full and told on WhatsApp.",
        ],
        note: "Members on Quarterly and Annual plans have unlimited classes, so a cancellation costs nothing. Repeated no-shows may pause class booking for a week.",
      },
      {
        title: "Personal training",
        paragraphs: [
          "PT blocks are valid for six months from the date of purchase.",
        ],
        list: [
          "Reschedule a session up to 12 hours ahead at no cost.",
          "Sessions cancelled inside 12 hours are counted as used.",
          "Unused sessions in a block are refunded pro-rata at the single-session rate if you cancel the block in writing.",
        ],
      },
      {
        title: "Shop orders",
        paragraphs: [
          "Supplements are sealed goods. We can only accept returns where the seal is intact.",
        ],
        list: [
          "Return unopened, unused items within 7 days of delivery or pickup.",
          "Opened supplements cannot be returned unless the product is faulty or past its expiry date on arrival.",
          "Apparel can be exchanged for another size within 7 days if unworn and tagged.",
          "Shipping charges are refunded only where the item was faulty or wrongly sent.",
        ],
      },
      {
        title: "How refunds are processed",
        paragraphs: [
          "All refunds go back to the original payment method through Razorpay. We do not refund to a different card, account or UPI ID.",
        ],
        list: [
          "Approved refunds are initiated within 3 working days.",
          "Your bank typically credits within 5–7 working days after that.",
          "A credit note with the reversed GST is emailed when the refund is initiated.",
        ],
      },
      {
        title: "Freezing instead of refunding",
        paragraphs: [
          "If you are travelling, injured or writing exams, freezing is usually better than cancelling. Quarterly plans can freeze up to 7 days and Annual up to 30 days, in blocks of at least 3 days. Message the front desk — no paperwork, no fee.",
        ],
      },
    ],
  },
  {
    slug: "guidelines",
    label: "Gym Guidelines & Etiquette",
    title: "Gym Guidelines & Etiquette",
    blurb: "How the floor runs so everyone gets a working set in.",
    intro:
      "Short rules, seriously enforced. They exist so the floor stays usable during the 7 PM rush.",
    updated: "01/07/2026",
    sections: [
      {
        title: "Before you train",
        paragraphs: [
          "Check in at the desk on every visit — your membership is verified by mobile number or the Member App.",
        ],
        list: [
          "Indoor training shoes only. No open footwear on the floor.",
          "Carry a towel. It is required on benches and machines.",
          "Bags and outdoor shoes go in the lockers, not on the floor.",
        ],
      },
      {
        title: "On the floor",
        paragraphs: [
          "Share the equipment. During peak hours, work in with whoever is waiting.",
        ],
        list: [
          "Re-rack your plates and dumbbells. Every time.",
          "Wipe down benches and pads after use.",
          "Limit rest on a machine to three minutes when someone is waiting.",
          "Do not drop loaded barbells outside the deadlift platforms.",
        ],
      },
      {
        title: "Phones, photos and music",
        paragraphs: [
          "Filming your own sets is fine. Filming other people is not.",
        ],
        list: [
          "Ask before recording anything that includes another member.",
          "Take calls in the lobby, not on the floor.",
          "Personal music through headphones only — floor speakers are set by staff.",
        ],
      },
      {
        title: "Classes",
        paragraphs: [
          "Doors close on the minute. If you are more than five minutes late, the coach may ask you to join the next session — warming up matters.",
        ],
        list: [
          "Book ahead through the site or the Member App.",
          "Cancel more than 4 hours ahead if you cannot make it.",
          "Put class equipment back where you found it.",
        ],
      },
      {
        title: "Conduct",
        paragraphs: [
          "Everyone trains here — beginners, competitors, older members, teenagers on a parent membership. Coaching people who did not ask is not welcome. Harassment of any kind ends the membership immediately, without refund.",
        ],
        note: "If something on the floor makes you uncomfortable, tell any staff member or write to hello@crunchfitness.in. Complaints are handled privately.",
      },
      {
        title: "Health and safety",
        paragraphs: [
          "Tell us about injuries, pregnancy or medical conditions before your first session so coaches can adjust your programme. Members train at their own risk; the gym is not liable for injury arising from ignoring coaching instruction or equipment guidance. Under-16s are not permitted on the weights floor.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    label: "Terms of Use",
    title: "Terms of Use",
    blurb: "The agreement covering memberships, bookings and this website.",
    intro:
      "The terms you accept when you buy a membership, book a class, or order from the shop.",
    updated: "01/07/2026",
    sections: [
      {
        title: "Who we are",
        paragraphs: [
          "Crunch Fitness is an independent Indian gym operator. We are not affiliated with, licensed by, or connected to any international fitness franchise of a similar name. GSTIN 07AABCU9603R1ZX.",
        ],
      },
      {
        title: "Accounts",
        paragraphs: [
          "You need an account to book classes, buy memberships or place shop orders.",
        ],
        list: [
          "Give accurate details — invoices and refunds depend on them.",
          "Keep your password to yourself. You are responsible for activity on your account.",
          "One account per person. Memberships cannot be shared or lent.",
          "Tell us immediately if you think someone else has access.",
        ],
      },
      {
        title: "Payments and pricing",
        paragraphs: [
          "All prices are in Indian Rupees and include GST unless stated otherwise. Payments are processed by Razorpay; we do not store card details.",
        ],
        list: [
          "Prices can change, but never mid-term for an active membership.",
          "A GST invoice is emailed after every successful payment.",
          "Failed or disputed payments may pause access until settled.",
        ],
      },
      {
        title: "Bookings",
        paragraphs: [
          "A class booking reserves one place at one location, at one time. Places are limited and allocated in order of booking. Cancellation windows are set out in the Refund Policy. We may cancel or move a class where numbers are too low or equipment is unavailable, and will refund or rebook you.",
        ],
      },
      {
        title: "Shop orders",
        paragraphs: [
          "Stock shown on the site reflects the selected location and can change between adding to cart and paying. Where an item is unavailable after payment, we refund that line in full. Shipping is handled by Shiprocket; delivery windows are estimates, not guarantees.",
        ],
      },
      {
        title: "Using this website",
        paragraphs: [
          "Content on this site — text, layout, photography and branding — belongs to Crunch Fitness.",
        ],
        list: [
          "Do not copy the site or its content for commercial use.",
          "Do not attempt to disrupt the site, scrape it, or interfere with other users.",
          "We may suspend access where these terms are broken.",
        ],
      },
      {
        title: "Liability",
        paragraphs: [
          "Training carries risk. We maintain equipment, employ certified coaches and keep the floor supervised, but you train at your own risk. Our liability is limited to the amount you paid for the service in question, except where limiting liability is not permitted by law.",
        ],
      },
      {
        title: "Changes and governing law",
        paragraphs: [
          "We may update these terms; material changes are announced on WhatsApp and at the desk at least 14 days ahead. These terms are governed by the laws of India, with jurisdiction in New Delhi.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    label: "Privacy Policy",
    title: "Privacy Policy",
    blurb: "What we collect, why, and how to have it deleted.",
    intro:
      "We collect what is needed to run a gym membership and nothing more. We do not sell your data.",
    updated: "01/07/2026",
    sections: [
      {
        title: "What we collect",
        paragraphs: ["Only what a membership, booking or order needs."],
        list: [
          "Name, mobile number, email address and home gym.",
          "Payment records — amount, date and Razorpay reference. Card numbers never reach us.",
          "Attendance and booking history at your location.",
          "Health information you choose to share with a coach, such as injuries or conditions.",
          "Delivery address, where you ask for a shop order to be shipped.",
        ],
      },
      {
        title: "Why we collect it",
        paragraphs: [
          "To run your membership: confirm bookings, issue GST invoices, send renewal reminders, ship orders and keep coaching safe. We also use aggregate attendance to schedule classes and staff shifts. That analysis never identifies individuals publicly.",
        ],
      },
      {
        title: "WhatsApp and messages",
        paragraphs: [
          "We send booking confirmations, invoices, renewal reminders and order tracking on WhatsApp because it is the fastest way to reach members.",
        ],
        list: [
          "Transactional messages come with the service and cannot be switched off while you hold a membership.",
          "Marketing messages — offers, new classes — are opt-in and can be turned off in your account at any time.",
        ],
        note: "Turn marketing messages on or off under Profile → Notifications in My Account.",
      },
      {
        title: "Who we share it with",
        paragraphs: [
          "A short list, all bound by contract, none permitted to use your data for their own marketing.",
        ],
        list: [
          "Razorpay — payment processing.",
          "Shiprocket — shipping and delivery tracking.",
          "Our gym management software provider — memberships, bookings and attendance.",
          "Government authorities where the law requires it.",
        ],
      },
      {
        title: "How long we keep it",
        paragraphs: [
          "Membership and payment records are kept for eight years as required for GST and accounting. Attendance and booking history is kept for two years after your membership ends. Health notes shared with a coach are deleted within twelve months of your last session unless you ask us to keep them.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          "Write to privacy@crunchfitness.in and we will respond within 30 days.",
        ],
        list: [
          "Ask for a copy of the data we hold on you.",
          "Ask us to correct anything that is wrong.",
          "Ask us to delete data we are not legally required to keep.",
          "Withdraw consent for marketing messages at any time.",
        ],
      },
      {
        title: "Cookies",
        paragraphs: [
          "The site uses cookies to keep you signed in, remember your selected location, and hold your cart between visits. We use privacy-friendly analytics to count page visits; it does not track you across other websites. Blocking cookies will break sign-in and checkout.",
        ],
      },
      {
        title: "CCTV",
        paragraphs: [
          "Both gyms are monitored by CCTV in common areas for safety and equipment security. There are no cameras in changing rooms, showers or toilets. Footage is retained for 30 days and reviewed only after an incident.",
        ],
      },
    ],
  },
];

export function findPolicy(slug: string): PolicyDoc | undefined {
  return POLICY_DOCS.find((doc) => doc.slug === slug);
}

/** Anchor id for a section: `refund-1`, `privacy-3`, … */
export function sectionId(doc: PolicyDoc, index: number): string {
  return `${doc.slug}-${index + 1}`;
}
