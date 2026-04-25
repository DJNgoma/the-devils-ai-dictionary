// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEntryShareCaption,
  EntryShareButton,
  entryShareImagePath,
} from "@/components/entry-share-button";

const originalFetch = globalThis.fetch;

function setShareApis({
  canShare,
  clipboardWriteText,
  share,
}: {
  canShare?: (data: ShareData) => boolean;
  clipboardWriteText?: (text: string) => Promise<void>;
  share?: (data: ShareData) => Promise<void>;
}) {
  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(window.navigator, "canShare", {
    configurable: true,
    value: canShare,
  });
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: clipboardWriteText ? { writeText: clipboardWriteText } : undefined,
  });
}

function mockImageFetch() {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(new Blob(["png"], { type: "image/png" }), {
      status: 200,
    }),
  );
}

function renderShareButton() {
  render(
    <EntryShareButton
      slug="agent"
      href="/dictionary/agent"
      title="Agent"
      definition="A workflow with delusions of grandeur."
    />,
  );
}

beforeEach(() => {
  vi.useRealTimers();
  mockImageFetch();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  setShareApis({});
  vi.restoreAllMocks();
});

describe("entry share helpers", () => {
  it("points at the entry opengraph image route", () => {
    expect(entryShareImagePath("agent")).toBe("/dictionary/agent/opengraph-image");
  });

  it("builds a caption with the title, definition, and word link", () => {
    expect(
      buildEntryShareCaption({
        title: "Agent",
        definition: "A workflow with delusions of grandeur.",
        url: "https://thedevilsaidictionary.com/dictionary/agent",
      }),
    ).toBe(
      "Agent\n\nA workflow with delusions of grandeur.\n\nhttps://thedevilsaidictionary.com/dictionary/agent",
    );
  });
});

describe("EntryShareButton", () => {
  it("shares the generated definition image and word link when files are supported", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn((data: ShareData & { files?: File[] }) => Boolean(data.files?.length));
    setShareApis({ canShare, share });

    renderShareButton();
    await user.click(screen.getByRole("button", { name: "Share word" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const payload = share.mock.calls[0][0] as ShareData & { files?: File[] };

    expect(globalThis.fetch).toHaveBeenCalledWith("/dictionary/agent/opengraph-image");
    expect(payload.files?.[0]).toBeInstanceOf(File);
    expect(payload.files?.[0]?.name).toBe("devils-ai-dictionary-agent.png");
    expect(payload.url).toMatch(/\/dictionary\/agent$/);
    expect(payload.text).toContain("A workflow with delusions of grandeur.");
    expect(payload.text).toContain(payload.url);
  });

  it("falls back to a link share when file shares are unavailable", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn((data: ShareData & { files?: File[] }) => !data.files?.length);
    setShareApis({ canShare, share });

    renderShareButton();
    await user.click(screen.getByRole("button", { name: "Share word" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const payload = share.mock.calls[0][0] as ShareData & { files?: File[] };

    expect(payload.files).toBeUndefined();
    expect(payload.text).toBe("A workflow with delusions of grandeur.");
    expect(payload.url).toMatch(/\/dictionary\/agent$/);
  });

  it("falls back to a link share when the image cannot be fetched", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn((data: ShareData & { files?: File[] }) => Boolean(data.files?.length));
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));
    setShareApis({ canShare, share });

    renderShareButton();
    await user.click(screen.getByRole("button", { name: "Share word" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const payload = share.mock.calls[0][0] as ShareData & { files?: File[] };

    expect(payload.files).toBeUndefined();
    expect(payload.text).toBe("A workflow with delusions of grandeur.");
    expect(payload.url).toMatch(/\/dictionary\/agent$/);
  });

  it("copies the caption when browser sharing is unavailable", async () => {
    const user = userEvent.setup();
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    setShareApis({ clipboardWriteText });

    renderShareButton();
    await user.click(screen.getByRole("button", { name: "Share word" }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText.mock.calls[0][0]).toContain("Agent");
    expect(clipboardWriteText.mock.calls[0][0]).toContain("/dictionary/agent");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
