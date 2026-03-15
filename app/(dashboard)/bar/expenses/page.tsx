import { redirect } from "next/navigation";

export default function BarExpensesPage() {
  redirect("/expenses?department=bar");
}
