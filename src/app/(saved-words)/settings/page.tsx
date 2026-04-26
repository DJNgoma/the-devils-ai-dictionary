import Link from "next/link";
import { DeveloperSettingsPanel } from "@/components/developer-settings-panel";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SavedWordsSyncPanel } from "@/components/saved-words-sync-panel";
import { WebNotificationSettings } from "@/components/web-notification-settings";
import { shouldShowDeveloperSettings } from "@/lib/feature-flags";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Settings",
  description:
    "Appearance, browser notifications, and the small local preferences that govern this device.",
  path: "/settings",
});

export default function SettingsPage() {
  const showDeveloperSettings = shouldShowDeveloperSettings();

  return (
    <div className="reading-shell space-y-10">
      <section className="space-y-4">
        <p className="page-kicker">Settings</p>
        <h1 className="page-title">Tune the site to suit the device in front of you.</h1>
        <p className="page-intro">
          These settings stay local to this browser unless the feature itself says
          otherwise. Local control. Fewer opportunities for cloud theatre.
        </p>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Appearance
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-soft">
          Auto keeps to Book in light mode and Night after dark. Choose a manual
          edition when this browser deserves something more deliberate.
        </p>
        <div className="mt-5 max-w-2xl">
          <ThemeSwitcher />
        </div>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-soft">
          If this browser can do web push, the daily word can arrive at the hour
          you choose. The site keeps only the endpoint and timing needed to carry
          out that minor interruption.
        </p>
        <div className="mt-5">
          <WebNotificationSettings />
        </div>
      </section>

      {showDeveloperSettings ? (
        <DeveloperSettingsPanel>
          <SavedWordsSyncPanel />
        </DeveloperSettingsPanel>
      ) : null}

      <section className="surface-strong p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Privacy
        </h2>
        <p className="mt-3 text-sm leading-7 text-foreground-soft">
          {showDeveloperSettings
            ? "Theme choice and saved words remain in browser storage unless you sign in and sync them."
            : "Theme choice and saved words remain in browser storage on this web build."}{" "}
          Optional push registration has its own paperwork in the privacy policy.
        </p>
        <Link href="/privacy" className="button button-secondary mt-5">
          Read the privacy policy
        </Link>
      </section>

      <div
        aria-hidden="true"
        className="h-[calc(var(--mobile-nav-height)+var(--safe-area-bottom)+2rem)] md:hidden"
      />
    </div>
  );
}
