import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import { db } from "@/db/client";
import { budgets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { FxTransferForm } from "./fx-transfer-form";
import { getTransfers } from "./transfers.actions";
import { FxTransferList } from "./fx-transfer-list";

export default async function FxPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
  });
  if (!budget) redirect("/app");

  const transfersResult = await getTransfers(year);
  const transfers = transfersResult.success ? transfersResult.data : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          FX Transfers
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Manage cross-currency transfers and track effective FX rates
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transfer Form */}
        <div className="card flex h-full flex-col p-6">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Create Transfer
          </h2>
          <FxTransferForm />
        </div>

        {/* Recent Transfers */}
        <div className="card flex h-full flex-col p-6">
          <h2 className="mb-4 shrink-0 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Recent Transfers
          </h2>
          <FxTransferList transfers={transfers} />
        </div>
      </div>
    </div>
  );
}
