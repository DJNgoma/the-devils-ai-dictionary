import { BrandMark } from "@/components/brand-mark";

const INK = "#1a0904";
const INK_SOFT = "rgba(26, 9, 4, 0.78)";
const INK_HAIRLINE = "rgba(26, 9, 4, 0.32)";
const INK_FAINT = "rgba(26, 9, 4, 0.20)";

const DISPLAY_FONT = "'Fraunces', Georgia, serif";
const BODY_FONT = "'Source Serif 4', Georgia, serif";

function normalizeText(text: string, limit: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= limit) {
    return cleaned;
  }

  return `${cleaned.slice(0, limit).trimEnd()}…`;
}

function fitTitleSize(title: string) {
  const length = title.length;
  if (length <= 12) return 132;
  if (length <= 18) return 116;
  if (length <= 26) return 96;
  if (length <= 36) return 80;
  return 68;
}

function fitDefinitionSize(definition: string) {
  const length = definition.length;
  if (length <= 90) return 36;
  if (length <= 140) return 32;
  return 28;
}

function BackgroundGlow() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(150deg, #ff6b3a 0%, #ff5b2c 55%, #f04a1c 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 12% 8%, rgba(255, 230, 205, 0.28) 0%, rgba(255, 230, 205, 0) 38%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 88% 92%, rgba(20, 6, 2, 0.30) 0%, rgba(20, 6, 2, 0) 50%)",
        }}
      />
    </>
  );
}

function FrameBorder() {
  return (
    <div
      style={{
        position: "absolute",
        top: 32,
        right: 36,
        bottom: 32,
        left: 36,
        border: `1.5px solid ${INK_FAINT}`,
        borderRadius: 18,
      }}
    />
  );
}

type WordmarkProps = {
  size?: "default" | "large";
};

function Wordmark({ size = "default" }: WordmarkProps) {
  const markSize = size === "large" ? 56 : 46;
  const fontSize = size === "large" ? 22 : 18;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        color: INK,
      }}
    >
      <BrandMark
        title=""
        style={{ width: markSize, height: markSize, color: INK }}
      />
      <div
        style={{
          display: "flex",
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        The Devil&apos;s AI Dictionary
      </div>
    </div>
  );
}

type FooterProps = {
  caption: string;
};

function Footer({ caption }: FooterProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        color: INK,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: BODY_FONT,
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: "0.02em",
        }}
      >
        thedevilsaidictionary.com
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: BODY_FONT,
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: INK_SOFT,
        }}
      >
        {caption}
      </div>
    </div>
  );
}

export function HomeShareCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "#ff5d2f",
        color: INK,
        padding: "60px 80px",
      }}
    >
      <BackgroundGlow />
      <FrameBorder />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Wordmark size="large" />
          <div
            style={{
              display: "flex",
              fontFamily: BODY_FONT,
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: INK_SOFT,
            }}
          >
            Online · Vol. I
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 80,
              height: 4,
              background: INK,
              marginBottom: 28,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: 84,
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              color: INK,
              maxWidth: 980,
              marginBottom: 28,
            }}
          >
            A sceptical field guide to AI language.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: BODY_FONT,
              fontWeight: 400,
              fontSize: 28,
              lineHeight: 1.35,
              color: INK_SOFT,
              maxWidth: 920,
            }}
          >
            The words machines, marketers, founders, and consultants use when
            they want to sound smarter than they are.
          </div>
        </div>

        <Footer caption="Plain English with bite" />
      </div>
    </div>
  );
}

type EntryShareCardProps = {
  title: string;
  definition: string;
  letter?: string;
};

export function EntryShareCard({
  title,
  definition,
  letter = title.charAt(0).toUpperCase(),
}: EntryShareCardProps) {
  const safeTitle = normalizeText(title, 56);
  const safeDefinition = normalizeText(definition, 220);
  const titleSize = fitTitleSize(safeTitle);
  const definitionSize = fitDefinitionSize(safeDefinition);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "#ff5d2f",
        color: INK,
        padding: "60px 80px",
      }}
    >
      <BackgroundGlow />
      <FrameBorder />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Wordmark />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              border: `2px solid ${INK_HAIRLINE}`,
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: 28,
              color: INK,
            }}
          >
            {letter}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: BODY_FONT,
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: INK_SOFT,
              marginBottom: 18,
            }}
          >
            Dictionary entry
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: titleSize,
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              color: INK,
              maxWidth: 1040,
              marginBottom: 24,
            }}
          >
            {safeTitle}
          </div>
          <div
            style={{
              display: "flex",
              width: 80,
              height: 4,
              background: INK,
              marginBottom: 24,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: BODY_FONT,
              fontWeight: 400,
              fontSize: definitionSize,
              lineHeight: 1.4,
              color: INK,
              maxWidth: 1040,
            }}
          >
            {safeDefinition}
          </div>
        </div>

        <Footer caption="Plain English with bite" />
      </div>
    </div>
  );
}
