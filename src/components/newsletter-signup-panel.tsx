"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type NewsletterSignupPanelProps = {
  className?: string;
  compact?: boolean;
  description: string;
  sourcePath: string;
  title: string;
};

type SubmissionState = {
  message: string;
  status: "idle" | "success" | "error";
};

const idleState: SubmissionState = {
  message: "",
  status: "idle",
};

export function NewsletterSignupPanel({
  className,
  compact = false,
  description,
  sourcePath,
  title,
}: NewsletterSignupPanelProps) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [submissionState, setSubmissionState] = useState(idleState);
  const [isPending, startTransition] = useTransition();

  return (
    <section
      className={cn(
        "surface-strong p-6 sm:p-8",
        compact && "p-5 sm:p-6",
        className,
      )}
    >
      <div className="max-w-3xl space-y-4">
        <div>
          <p className="page-kicker">Newsletter</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
        </div>
        <p className="text-base leading-8 text-foreground-soft">{description}</p>
        <p className="text-sm leading-7 text-foreground-soft">
          Weekly digest on Tuesday mornings, Johannesburg time. Unsubscribe anytime.
          No reader account theatre.
        </p>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);

            startTransition(() => {
              void submitNewsletterSignup(formData, sourcePath)
                .then((result) => {
                  setSubmissionState(result);

                  if (result.status === "success") {
                    setEmail("");
                    event.currentTarget.reset();
                  }
                })
                .catch(() => {
                  setSubmissionState({
                    status: "error",
                    message:
                      "The sign-up did not land cleanly. Please try again in a moment.",
                  });
                });
            });
          }}
        >
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className="field-input"
              disabled={isPending}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (submissionState.status !== "idle") {
                  setSubmissionState(idleState);
                }
              }}
              required
            />
            <button
              type="submit"
              className="button button-primary"
              disabled={isPending}
            >
              {isPending ? "Joining..." : "Join the digest"}
            </button>
          </div>
          <div className="hidden" aria-hidden="true">
            <label htmlFor={`${emailId}-company`}>Company</label>
            <input id={`${emailId}-company`} name="company" type="text" tabIndex={-1} />
          </div>
          {submissionState.status !== "idle" ? (
            <p
              role="status"
              className={cn(
                "text-sm leading-7",
                submissionState.status === "success"
                  ? "text-accent"
                  : "text-danger",
              )}
            >
              {submissionState.message}
            </p>
          ) : null}
        </form>
        <p className="text-sm leading-7 text-foreground-soft">
          Prefer to inspect the digest before you subscribe?{" "}
          <Link href="/newsletter/digest" className="text-accent hover:text-foreground">
            Read the current preview
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

async function submitNewsletterSignup(
  formData: FormData,
  sourcePath: string,
): Promise<SubmissionState> {
  const response = await fetch("/api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company: formData.get("company"),
      email: formData.get("email"),
      sourcePath,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    return {
      status: "error",
      message:
        payload?.message ??
        "The sign-up did not land cleanly. Please try again in a moment.",
    };
  }

  return {
    status: "success",
    message:
      payload?.message ??
      "Check your inbox for the confirmation note. Buttondown will do the polite double opt-in bit.",
  };
}
