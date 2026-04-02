import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description:
    "What The Devil's AI Dictionary stores, what it does not, and how optional mobile notifications work.",
  path: "/privacy",
});

const effectiveDate = "April 2, 2026";

export default function PrivacyPage() {
  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">Privacy</p>
        <h1 className="page-title">Privacy policy</h1>
        <p className="page-intro">
          This policy covers the website at{" "}
          <span className="font-mono">thedevilsaidictionary.com</span>, the
          companion mobile apps, and the small amount of data required to keep
          them working.
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-foreground-soft">
          Effective {effectiveDate}
        </p>
      </section>

      <section className="surface-strong p-6 sm:p-8">
        <div className="book-prose">
          <p>
            The project is a digital book, not a surveillance empire. You do not
            need an account to browse the site, buy nothing to read it, and there
            is no social feed waiting to become everybody&apos;s problem.
          </p>
          <p>
            We still need a few ordinary technical signals to serve pages, save
            reading state on your device, and optionally deliver iPhone
            notifications. This page explains what those signals are and what we
            do with them.
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Website
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-foreground-soft">
            <p>
              The web app stores your chosen theme and saved reading place in your
              browser&apos;s local storage. That data stays on your device unless
              your browser syncs it through your own account.
            </p>
            <p>
              We do not require sign-up, profile creation, or payment details to
              use the site.
            </p>
          </div>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Native apps
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-foreground-soft">
            <p>
              The iPhone and Android apps store similar on-device state: theme,
              saved reading place, current-word state, and catalogue files so the
              experience can resume quickly and work with locally cached content.
            </p>
            <p>
              That local app data is stored on your device and is removed if you
              clear app data or uninstall the app.
            </p>
          </div>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Optional notifications
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-foreground-soft">
            <p>
              If you enable iPhone notifications, the app sends us an Apple push
              token together with platform, environment, app version, and locale
              so we can deliver the current-word notification you asked for.
            </p>
            <p>
              Apple delivers those notifications through APNs. If you do not
              enable notifications, we do not receive a push token from you.
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          What we collect
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft">
          <li>
            Standard request data that infrastructure ordinarily sees when serving
            a site or API, such as IP address, user agent, request path, and
            timestamps.
          </li>
          <li>
            On-device preference and reading-state data, such as theme choice and
            saved place, stored locally in the browser or app.
          </li>
          <li>
            For iPhone notifications only, the push registration payload described
            above: token, platform, environment, app version, locale, and opt-in
            status.
          </li>
        </ul>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          What we do not do
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft">
          <li>We do not sell personal data.</li>
          <li>
            We do not run behavioural advertising or build marketing profiles
            around your reading habits.
          </li>
          <li>
            We do not currently use third-party analytics SDKs or advertising
            cookies on the site.
          </li>
          <li>
            We do not ask for accounts, passwords, or payment cards to read the
            dictionary.
          </li>
        </ul>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          How data is used and shared
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-foreground-soft">
          <p>
            We use the limited data above to render pages, remember local reading
            state on your device, update native catalogue files, and deliver
            optional notifications.
          </p>
          <p>
            Data may be processed by service providers that help run the project,
            including hosting and infrastructure providers, and by Apple when push
            notifications are sent through APNs. We share data only to the extent
            needed to operate the service, secure it, or deliver the features you
            explicitly turn on.
          </p>
        </div>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Retention and your choices
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft">
          <li>
            Browser local-storage data remains until you clear it or your browser
            removes it.
          </li>
          <li>
            Native app data remains on-device until you clear app data or remove
            the app.
          </li>
          <li>
            Push-registration records are kept until they are updated, invalidated,
            or no longer needed to operate notifications.
          </li>
          <li>
            You can disable notifications at any time in iOS settings. You can
            also stop using local storage by clearing site data in your browser.
          </li>
        </ul>
      </section>

      <section className="surface-strong p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Changes and contact
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-foreground-soft">
          <p>
            If this policy changes in a material way, the updated version will be
            posted on this page with a new effective date.
          </p>
          <p>
            Privacy questions can be raised through{" "}
            <a
              href={`${siteConfig.repoUrl}/issues`}
              target="_blank"
              rel="noreferrer"
              className="link-underline text-foreground"
            >
              GitHub issues
            </a>{" "}
            or the project links listed on{" "}
            <a
              href="https://daliso.com"
              target="_blank"
              rel="noreferrer"
              className="link-underline text-foreground"
            >
              daliso.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
