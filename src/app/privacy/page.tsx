import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description:
    "What The Devil's AI Dictionary stores, what it does not, and how optional notifications work across the site and apps.",
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
            reading state on your device, and optionally deliver browser or app
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
              The web app stores your chosen theme and saved words in your
              browser&apos;s local storage. If you choose Sign in with Apple, the
              site also stores the Apple account identifier, a session record, and
              the saved words you asked it to sync.
            </p>
            <p>
              We do not require sign-up, profile creation, or payment details to
              use the site. The Apple sign-in is optional and only matters if you
              want saved words to follow you between installs.
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
              saved words, current-word state, and catalogue files so the
              experience can resume quickly and work with locally cached content.
            </p>
            <p>
              On iPhone, if you use Sign in with Apple, the app also stores an
              account identity locally and syncs saved words through the same
              backend session used by the website.
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
              If you enable notifications on iPhone, Android, or a supported web
              browser, we receive the push endpoint or device token together with
              platform, environment, app version, locale, preferred delivery
              hour, time zone, and opt-in status so we can deliver the
              current-word notification you asked for.
            </p>
            <p>
              Delivery then runs through the relevant push service, such as APNs,
              FCM, or your browser&apos;s web-push provider. If you do not enable
              notifications, we do not receive a working push endpoint from you.
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
            saved words, stored locally in the browser or app.
          </li>
          <li>
            If you use Sign in with Apple, the Apple account identifier, session
            records, and the saved words you choose to sync.
          </li>
          <li>
            For optional notifications, the push registration payload described
            above: endpoint or token, platform, environment, app version, locale,
            preferred delivery hour, time zone, and opt-in status.
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
            We do not ask for passwords or payment cards to read the dictionary.
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
            state on your device, sync saved words when you explicitly sign in,
            update native catalogue files, and deliver optional notifications.
          </p>
          <p>
            Data may be processed by service providers that help run the project,
            including hosting and infrastructure providers, and by Apple, Google,
            Mozilla, or other browser-vendor push services when notifications are
            sent through APNs, FCM, or standard web push. We share data only to
            the extent needed to operate the service, secure it, or deliver the
            features you explicitly turn on.
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
            Apple sign-in session and saved-word sync records remain until they
            expire, are replaced, or are no longer needed to operate sync.
          </li>
          <li>
            Push-registration records are kept until they are updated, invalidated,
            or no longer needed to operate notifications.
          </li>
          <li>
            You can disable notifications at any time in your browser settings or
            the site&apos;s settings page, and in iOS or Android system settings for
            the native apps. You can also stop using local storage by clearing
            site data in your browser.
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
