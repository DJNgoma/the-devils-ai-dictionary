import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/newsletter/subscribe/route";

const originalButtondownApiKey = process.env.BUTTONDOWN_API_KEY;

function makeRequest(
  body: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  return new Request("https://thedevilsaidictionary.com/api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  if (originalButtondownApiKey === undefined) {
    delete process.env.BUTTONDOWN_API_KEY;
  } else {
    process.env.BUTTONDOWN_API_KEY = originalButtondownApiKey;
  }
});

describe("POST /api/newsletter/subscribe", () => {
  it("rejects invalid email addresses before touching Buttondown", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        email: "not-an-email",
        sourcePath: "/newsletter",
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a configuration error when the provider token is missing", async () => {
    delete process.env.BUTTONDOWN_API_KEY;

    const response = await POST(
      makeRequest({
        email: "reader@example.com",
        sourcePath: "/newsletter",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
    });
  });

  it("short-circuits honeypot submissions with a generic success message", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        company: "Acme Corp",
        email: "bot@example.com",
        sourcePath: "/dictionary/agent",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      ok: true,
    });
  });

  it("forwards valid subscriptions to Buttondown with source metadata", async () => {
    process.env.BUTTONDOWN_API_KEY = "test-buttondown-token";

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest(
        {
          email: "reader@example.com",
          sourcePath: "/dictionary/agent",
        },
        {
          "x-forwarded-for": "203.0.113.10, 198.51.100.11",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    const providerPayload = JSON.parse(requestInit.body as string) as Record<
      string,
      unknown
    >;

    expect(url).toBe("https://api.buttondown.com/v1/subscribers");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers.Authorization).toBe(
      "Token test-buttondown-token",
    );
    expect(providerPayload).toMatchObject({
      email_address: "reader@example.com",
      ip_address: "203.0.113.10",
      metadata: {
        digest: "weekly",
        sourcePath: "/dictionary/agent",
      },
      referrer_url: "https://thedevilsaidictionary.com/dictionary/agent",
      tags: ["website", "weekly-digest"],
      utm_campaign: "weekly_digest",
      utm_medium: "signup_form",
      utm_source: "website",
    });
  });

  it("treats duplicate subscribers as a generic success", async () => {
    process.env.BUTTONDOWN_API_KEY = "test-buttondown-token";

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        email: "reader@example.com",
        sourcePath: "/newsletter",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
    });
  });
});
