import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetTrackingPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  if (!Number.isInteger(year)) {
    redirect("/app");
  }

  // Month is part of the URL. Redirect to a sensible default month.
  const now = new Date();
  const defaultMonth = now.getFullYear() === year ? now.getMonth() + 1 : 1;
  redirect(`/app/${year}/tracking/${defaultMonth}`);
}
