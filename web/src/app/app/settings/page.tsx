import { AuthService } from "@/lib/auth-service";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { ProfileSettingsForm } from "./profile-settings-form";
import Link from "next/link";
import Image from "next/image";

export default async function SettingsPage() {
  const user = await AuthService.getCurrentUser();

  const profile =
    (await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) })) ??
    (
      await db
        .insert(profiles)
        .values({ id: user.id })
        .returning()
    )[0];

  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 py-16"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-3">
          <Link href="/app">
            <Image
              src="/logo.png"
              alt="Nuvio"
              width={352}
              height={116}
              className="logo"
              style={{ width: "auto", height: "28px", objectFit: "contain", objectPosition: "left" }}
            />
          </Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
              Preferences
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Manage your account settings.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4 space-y-2 text-sm">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Email</span>
              <span className="text-xs" style={{ color: "var(--color-text)" }}>{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Locale</span>
              <span className="text-xs" style={{ color: "var(--color-text)" }}>{profile.locale}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Timezone</span>
              <span className="text-xs" style={{ color: "var(--color-text)" }}>{profile.timeZone}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency preferences</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <ProfileSettingsForm currentBaseCurrency={profile.baseCurrency} />
          </div>
        </Card>

        <div className="text-center">
          <Link href="/app" className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            ← Back to year trackers
          </Link>
        </div>
      </div>
    </main>
  );
}
