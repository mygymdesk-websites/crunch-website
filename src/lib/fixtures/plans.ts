import type { MgdPlan, PlansResponse } from "@/lib/mgd/types";

/**
 * Placeholder membership + personal-training pricing, shaped exactly like
 * `GET website-services?resource=plans`.
 *
 * Two contract details worth remembering when Phase 2 swaps these out:
 *
 *   - `price: 0` means "no price set" and must render as "Contact us", not
 *     "₹0". Partner Training below is the case that exercises it.
 *   - membership plans are TENANT-WIDE, so `locationId` is always null. Only
 *     service packages can be branch-scoped.
 *
 * ⚠ PT packages: the API doc is explicit that `resource=plans` covers
 * membership plans and *service packages* only — "PT plans and class packages
 * are not included". The design has a Personal Training section, so Phase 2
 * has to confirm the gym models PT blocks as service packages in MyGymDesk. If
 * they are modelled as PT plans, this section has no API source and needs a
 * Track A change. Flagged in HANDOFF.md.
 */

export const MEMBERSHIP_PLANS_FIXTURE: PlansResponse = {
  plans: [
    {
      id: "plan-day-pass",
      name: "Day Pass",
      price: 300,
      currency: "INR",
      interval: "day_pass",
      intervalLabel: "per visit",
      durationDays: 1,
      description: "Walk in, train, leave.",
      features: [
        "Full gym floor for one day",
        "Locker & shower",
        "Valid at one location",
      ],
      featured: false,
      displayOrder: 1,
      locationId: null,
      locationName: null,
    },
    {
      id: "plan-monthly",
      name: "Monthly",
      price: 2500,
      currency: "INR",
      interval: "month",
      intervalLabel: "per month",
      durationDays: 30,
      description: "Rolling — cancel any time.",
      features: [
        "Full gym floor access",
        "2 group classes a week",
        "Locker & shower",
        "Member App access",
      ],
      featured: false,
      displayOrder: 2,
      locationId: null,
      locationName: null,
    },
    {
      id: "plan-quarterly",
      name: "Quarterly",
      price: 6500,
      currency: "INR",
      interval: "quarter",
      intervalLabel: "per quarter",
      durationDays: 90,
      description: "Works out to ₹2,167 a month.",
      features: [
        "Full gym floor access",
        "Unlimited group classes",
        "1 body composition check",
        "Freeze up to 7 days",
      ],
      featured: false,
      displayOrder: 3,
      locationId: null,
      locationName: null,
    },
    {
      id: "plan-annual",
      name: "Annual",
      price: 24000,
      currency: "INR",
      interval: "year",
      intervalLabel: "per year",
      durationDays: 365,
      description: "Works out to ₹2,000 a month.",
      features: [
        "Everything in Quarterly",
        "2 personal training sessions",
        "Guest pass every quarter",
        "Freeze up to 30 days",
      ],
      // The owner's "most popular" pick — at most one across the list.
      featured: true,
      displayOrder: 4,
      locationId: null,
      locationName: null,
    },
  ],
};

export const PT_PLANS_FIXTURE: PlansResponse = {
  plans: [
    {
      id: "pt-single",
      name: "Single Session",
      price: 800,
      currency: "INR",
      interval: "custom",
      intervalLabel: "per session",
      durationDays: null,
      description: "Try a coach before committing.",
      features: [
        "One 60-minute session",
        "Movement assessment",
        "Written notes after the session",
      ],
      featured: false,
      displayOrder: 1,
      locationId: null,
      locationName: null,
    },
    {
      id: "pt-8",
      name: "8 Sessions",
      price: 6000,
      currency: "INR",
      interval: "custom",
      intervalLabel: "per block",
      durationDays: 180,
      description: "₹750 a session.",
      features: [
        "Eight 60-minute sessions",
        "Programme written for you",
        "Form video review",
        "Valid six months",
      ],
      featured: false,
      displayOrder: 2,
      locationId: null,
      locationName: null,
    },
    {
      id: "pt-12",
      name: "12 Sessions",
      price: 8400,
      currency: "INR",
      interval: "custom",
      intervalLabel: "per block",
      durationDays: 180,
      description: "₹700 a session.",
      features: [
        "Twelve 60-minute sessions",
        "Programme + nutrition guidance",
        "Monthly body composition check",
        "Valid six months",
      ],
      featured: true,
      displayOrder: 3,
      locationId: null,
      locationName: null,
    },
    {
      id: "pt-partner",
      name: "Partner Training",
      // 0 = no price set → the card renders "Contact us" and an enquiry flow.
      price: 0,
      currency: "INR",
      interval: "custom",
      intervalLabel: "",
      durationDays: null,
      description: "Quoted after a short call.",
      features: [
        "Two people, one coach",
        "Sessions split as you like",
        "Suited to couples and siblings",
        "Quoted per pair",
      ],
      featured: false,
      displayOrder: 4,
      locationId: null,
      locationName: null,
    },
  ],
};

/** The plan the homepage highlights. Falls back to the first plan. */
export function featuredPlan(plans: MgdPlan[]): MgdPlan | undefined {
  return plans.find((p) => p.featured) ?? plans[0];
}
