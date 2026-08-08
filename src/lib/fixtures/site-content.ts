/**
 * Editorial site content — coaches, facilities, testimonials, FAQs, stats.
 *
 * Not MyGymDesk data and never will be: MGD has no API for any of this. It
 * lives here as placeholder copy lifted from the approved design, and moves
 * into the admin panel (or a CMS) if the client asks for it later.
 */

const UNSPLASH = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

export interface Trainer {
  name: string;
  /** Short role, used on the homepage. */
  role: string;
  /** Longer specialism, used on About. */
  specialism: string;
  /** Slug of the location they coach at. */
  locationSlug: string;
  /**
   * Portrait. The four real trainer photos live in the Claude Design project
   * under `uploads/` — they exceed the design-sync read cap, so they have to
   * be downloaded by hand into public/images/trainers/. Until they are, the
   * striped placeholder renders. See HANDOFF.md.
   */
  image: string;
}

export const TRAINERS: Trainer[] = [
  {
    name: "Rahul Bisht",
    role: "Fitness Trainer",
    specialism: "Strength & Powerlifting",
    locationSlug: "vasant-kunj",
    image: "/images/trainers/rahul-bisht.jpg",
  },
  {
    name: "King Nash",
    role: "Fitness Trainer",
    specialism: "Bodybuilding & Hypertrophy",
    locationSlug: "vasant-kunj",
    image: "/images/trainers/king-nash.jpg",
  },
  {
    name: "Harry Singh",
    role: "Fitness Trainer",
    specialism: "Functional & Conditioning",
    locationSlug: "gurgaon",
    image: "/images/trainers/harry-singh.jpg",
  },
  {
    name: "Abhishek Guha",
    role: "Fitness Trainer",
    specialism: "Personal Training",
    locationSlug: "gurgaon",
    image: "/images/trainers/abhishek-guha.jpg",
  },
];

export interface Facility {
  name: string;
  description: string;
  image: string;
}

export const FACILITIES: Facility[] = [
  {
    name: "Free weight floor",
    description:
      "Four power racks, two platforms, calibrated plates to 25 kg and dumbbells to 50 kg.",
    image: UNSPLASH("1534438327276-14e5300c3a48", 700),
  },
  {
    name: "Strength machines",
    description:
      "Plate-loaded and selectorised lines, serviced monthly, cables replaced on schedule.",
    image: UNSPLASH("1583454110551-21f2fa2afe61", 700),
  },
  {
    name: "Cardio deck",
    description:
      "Treadmills, rowers, assault bikes and stair mills — all with working screens.",
    image: UNSPLASH("1534787238916-9ba6764efd4f", 700),
  },
  {
    name: "Studio",
    description:
      "Sprung floor for Zumba, yoga and mobility. Mats, blocks and straps provided.",
    image: UNSPLASH("1544367567-0f2fcb009e0b", 700),
  },
  {
    name: "Functional turf",
    description:
      "Sled lane, ropes, kettlebells and med balls for conditioning classes and carries.",
    image: UNSPLASH("1533560904424-a0c61dc306fc", 700),
  },
  {
    name: "Changing rooms",
    description:
      "Day lockers, hot showers and a towel service included in every membership.",
    image: UNSPLASH("1540497077202-7c8a3999166f", 700),
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  meta: string;
  image: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I came in for three months before my wedding and stayed two years. The coaches fixed my deadlift in the first week.",
    name: "Rahul Mehra",
    meta: "Member since 2023",
    image: UNSPLASH("1507003211169-0a1dd7228f2d", 200),
  },
  {
    quote:
      "The 6 AM class actually starts at 6 AM. That sounds small until you have tried other gyms in the city.",
    name: "Simran Kaur",
    meta: "Member since 2024",
    image: UNSPLASH("1494790108377-be9c29b29330", 200),
  },
  {
    quote:
      "Clean floor, working machines, and nobody hovers to sell you a package. Invoices land on WhatsApp the same minute.",
    name: "Aditya Nair",
    meta: "Member since 2022",
    image: UNSPLASH("1500648767791-00dcc994a43e", 200),
  },
];

/** The social strip on the homepage. */
export const SOCIAL_TILES: string[] = [
  UNSPLASH("1534438327276-14e5300c3a48", 400),
  UNSPLASH("1571902943202-507ec2618e8f", 400),
  UNSPLASH("1526506118085-60ce8714f8c5", 400),
  UNSPLASH("1518611012118-696072aa579a", 400),
  UNSPLASH("1581009146145-b5ef050c2e1e", 400),
  UNSPLASH("1540497077202-7c8a3999166f", 400),
];

export const ABOUT_GALLERY: string[] = [
  UNSPLASH("1571902943202-507ec2618e8f", 500),
  UNSPLASH("1526506118085-60ce8714f8c5", 500),
  UNSPLASH("1518611012118-696072aa579a", 500),
  UNSPLASH("1581009146145-b5ef050c2e1e", 500),
  UNSPLASH("1517836357463-d25dfeac3438", 500),
  UNSPLASH("1594737625785-a6cbdabd333c", 500),
];

export const HERO_IMAGE = UNSPLASH("1541534741688-6078c6bfb5c5", 1000);
export const ABOUT_HERO_IMAGE = UNSPLASH("1571902943202-507ec2618e8f", 1100);

/** Photos used on the location cards, keyed by location slug. */
export const LOCATION_IMAGES: Record<string, string> = {
  "vasant-kunj": UNSPLASH("1571902943202-507ec2618e8f", 900),
  gurgaon: UNSPLASH("1540497077202-7c8a3999166f", 900),
};

export interface Stat {
  value: string;
  label: string;
}

export const HERO_STATS: Stat[] = [
  { value: "1,800+", label: "Active members" },
  { value: "14", label: "Certified coaches" },
];

export const ABOUT_STATS: Stat[] = [
  { value: "1,800+", label: "Active members" },
  { value: "14", label: "Certified coaches" },
  { value: "8", label: "Years running" },
  { value: "42", label: "Classes a week" },
];

/** Numbered "why us" features. The design uses 01–04 instead of icons. */
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

/** The three tracked numbers on the homepage. */
export const TRUST_BARS = [
  { label: "Member satisfaction", percent: 95 },
  { label: "Annual renewals", percent: 90 },
  { label: "Classes that start on time", percent: 98 },
];

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
