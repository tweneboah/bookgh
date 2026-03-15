import { redirect } from "next/navigation";

export default function BarPricingRulesPage() {
  redirect("/pricing-rules?type=special&department=bar");
}
