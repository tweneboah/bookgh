import { redirect } from "next/navigation";

export default function BarPaymentsPage() {
  redirect("/payments?department=bar");
}
