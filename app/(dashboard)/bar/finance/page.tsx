import { redirect } from "next/navigation";

export default function BarFinancePage() {
  redirect("/invoices?department=bar");
}
