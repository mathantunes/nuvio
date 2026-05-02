import { redirect } from "next/navigation";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  redirect(`/app/${year}/variance`);
}
