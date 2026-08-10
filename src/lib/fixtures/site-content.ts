/**
 * Editorial site content — coaches, facilities, testimonials, stats.
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  EVERY LIST BELOW IS DELIBERATELY EMPTY.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * These held placeholder copy carried over from the design mock: invented
 * member testimonials with invented names and join dates, a member count, a
 * satisfaction percentage, coach specialisms, and specific equipment claims.
 *
 * On a design mock that is fine. On a live gym's website every one of them is
 * a factual claim the business has not made — and a fabricated testimonial
 * attributed to a named person is the kind of thing that gets a real business
 * in real trouble.
 *
 * So they follow the same rule as the PT price: DERIVE IT OR OMIT IT. Each
 * section checks its list and hides itself when empty. Nothing here is
 * replaced with a guess.
 *
 * To restore a section, fill its array with CLIENT-CONFIRMED content — the
 * shapes are unchanged, so nothing else needs touching. See
 * CLIENT-CONTENT-REQUIRED in HANDOFF.md for the list the client owes.
 */

export interface Trainer {
  name: string;
  /** Short role, used on the homepage. */
  role: string;
  /** Longer specialism, used on About. */
  specialism: string;
  /** Slug of the location they coach at. */
  locationSlug: string;
  /** Portrait in public/images/trainers/. */
  image: string;
}

/**
 * MOVED TO THE DATABASE. Coaches now live in the `trainers` table and are
 * managed from Admin → Content, so the client owns their own names, titles and
 * photographs. This type is kept only for the fixture shape; nothing reads it.
 *
 * The original four names came from the design export and were real people,
 * but their roles and branches were written for the mock — which is why they
 * were never published and are not seeded here either.
 */
export const TRAINERS: Trainer[] = [];

export interface Facility {
  name: string;
  description: string;
  image: string;
}

/**
 * Held specific equipment counts ("four power racks, two platforms,
 * calibrated plates to 25 kg"). Nobody has counted the racks.
 */
export const FACILITIES: Facility[] = [];

export interface Testimonial {
  quote: string;
  name: string;
  meta: string;
  image: string;
}

/**
 * ⚠️ Held three invented member reviews with invented names, join dates and
 * stock-photo faces. Fabricated endorsements are the single highest-risk item
 * in this sweep — do not repopulate without the member's actual words and
 * their permission to publish them.
 */
export const TESTIMONIALS: Testimonial[] = [];

/** Homepage social strip — was stock photography presented as the gym's feed. */
export const SOCIAL_TILES: string[] = [];

/** About page photo strip — same problem. */
export const ABOUT_GALLERY: string[] = [];

/**
 * MOVED TO THE DATABASE — `site_images`, managed from Admin → Content.
 * Null still renders the design's striped placeholder.
 */
export const HERO_IMAGE: string | null = null;
export const ABOUT_HERO_IMAGE: string | null = null;

/** Photos used on the location cards, keyed by location slug. */
export const LOCATION_IMAGES: Record<string, string> = {};

export interface Stat {
  value: string;
  label: string;
}

/** Was "1,800+ active members · 14 certified coaches". Nobody counted. */
export const HERO_STATS: Stat[] = [];

/** Was the same, plus "8 years running" and "42 classes a week". */
export const ABOUT_STATS: Stat[] = [];

/**
 * Numbered "why us" features. These are positioning, not measurable claims
 * ("form checks are free, not upsold"), so they stay — but the client should
 * still confirm each is true of how they actually operate.
 */
export const WHY_US = [
  {
    title: "Coaches on the floor",
    body: "Every shift has a certified trainer walking the floor. Form checks are free, not upsold.",
  },
  {
    title: "Equipment that works",
    body: "Serviced monthly. Calibrated plates, maintained cables, cardio with working screens.",
  },
  {
    title: "Book from your phone",
    body: "Class slots, membership renewals and invoices in the Member App. Confirmations on WhatsApp.",
  },
  {
    title: "No lock-in games",
    body: "Transparent pricing, GST invoice on every payment, and a refund policy written in plain language.",
  },
];

export interface TrustBar {
  label: string;
  percent: number;
}

/**
 * ⚠️ Held "95% member satisfaction", "90% annual renewals", "98% of classes
 * start on time" — three statistics with no measurement behind any of them.
 */
export const TRUST_BARS: TrustBar[] = [];

export const CONTACT_FAQS = [
  {
    q: "Do I need to book a trial in advance?",
    a: "Yes — one session per person, and slots fill up in the evening. The form or WhatsApp both work.",
  },
  {
    q: "Can I visit before joining?",
    a: "Walk in during opening hours and ask for a floor tour. No appointment needed.",
  },
  {
    q: "Do you do corporate plans?",
    a: 'Yes, for teams of five and up. Pick "Corporate / bulk plans" in the form and we will send rates.',
  },
  {
    q: "How do I cancel a class booking?",
    a: "From the Member App, up to four hours before the class, for a full refund.",
  },
];

export const PACKAGES_FAQS = [
  {
    q: "Is there a joining fee?",
    a: "No. The price you see is the price you pay, GST included.",
  },
  {
    q: "Can I use both locations?",
    a: "Annual members can. Monthly and Quarterly are tied to the location you sign up at.",
  },
  {
    q: "What if I want to stop?",
    a: "Monthly is rolling — skip the next payment and it lapses. Longer plans follow the refund policy.",
  },
  {
    q: "Do you take UPI?",
    a: "Yes. UPI, cards and netbanking, all through Razorpay.",
  },
];

/** Enquiry subjects offered on the contact form. */
export const CONTACT_SUBJECTS = [
  "Membership enquiry",
  "Personal training",
  "Group classes",
  "Shop order",
  "Corporate / bulk plans",
  "Feedback or complaint",
  "Something else",
];

/** Interests offered on the trial modal and appointment form. */
export const TRIAL_INTERESTS = [
  "Gym Membership",
  "Personal Training",
  "Group Classes",
  "Strength Training",
  "HIIT Circuit",
  "Yoga & Mobility",
];

export const APPOINTMENT_TIMEFRAMES = [
  "This week",
  "This month",
  "Next month",
  "Just exploring",
];

/** Indian states offered in the checkout address form. */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
