import type { Metadata } from "next";

import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to track your Crunch Fitness shop orders and download GST invoices.",
  alternates: { canonical: "/account" },
  // A personal account area has no business in search results.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="px-5 py-[72px]">
      <AccountView />
    </div>
  );
}
