import { AuthService } from "@/lib/auth-service";
import { fetchLoanData } from "@/lib/loan-computations";
import { AssetsPage } from "./assets-page";

export default async function AssetsRoute({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();
  const loanData = await fetchLoanData(user.id, year);

  return <AssetsPage assets={loanData.allAssets} year={year} />;
}
