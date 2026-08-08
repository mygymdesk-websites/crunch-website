import { redirect } from "next/navigation";

import { POLICY_DOCS } from "@/content/policies";

/** /policies has no page of its own — land on the first document. */
export default function PoliciesIndex() {
  redirect(`/policies/${POLICY_DOCS[0].slug}`);
}
