import { BrandMark } from "@/components/brand-mark";

function normalizeText(text: string, limit: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= limit) {
    return cleaned;
  }

  return `${cleaned.slice(0, limit).trimEnd()}…`;
}

function Frame() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 34,
          border: "1px solid rgba(33, 10, 4, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 34,
          right: 34,
          height: 1,
          background: "rgba(33, 10, 4, 0.14)",
        }}
      />
    </>
  );
}

function BackgroundGlow() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(140deg, #ff5b2c 0%, #ff6233 38%, #ff6d2c 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 14% 18%, rgba(255, 207, 176, 0.18) 0%, rgba(255, 207, 176, 0) 30%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 78% 74%, rgba(23, 12, 8, 0.16) 0%, rgba(23, 12, 8, 0.09) 18%, rgba(255, 91, 44, 0) 48%)",
        }}
      />
    </>
  );
}

export function HomeShareCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#ff5d2f",
        color: "#1a0904",
        padding: 0,
      }}
    >
      <BackgroundGlow />
      <Frame />

      <div
        style={{
          position: "absolute",
          top: 84,
          left: 88,
          right: 88,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            opacity: 0.76,
          }}
        >
          Online book
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 0.96,
            color: "rgba(73, 17, 8, 0.22)",
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            maxWidth: 760,
          }}
        >
          <div style={{ fontSize: 68 }}>THE DEVIL&apos;S</div>
          <div
            style={{
              margin: "18px 0 16px",
              height: 1,
              width: 690,
              background: "rgba(60, 15, 7, 0.22)",
            }}
          />
          <div style={{ fontSize: 74 }}>AI DICTIONARY</div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          bottom: 92,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 560,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 146,
            height: 2,
            background: "rgba(36, 13, 7, 0.32)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 46,
            lineHeight: 1.04,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            color: "#240d07",
          }}
        >
          A sceptical field guide
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            lineHeight: 1.5,
            color: "rgba(36, 13, 7, 0.82)",
          }}
        >
          The language machines, marketers, founders, and consultants use when
          they want to sound smarter than they are.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 110,
          bottom: 84,
          width: 248,
          height: 332,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 34,
          border: "1px solid rgba(22, 8, 4, 0.14)",
          background: "rgba(22, 8, 4, 0.08)",
          boxShadow: "0 26px 44px rgba(22, 8, 4, 0.12)",
          color: "#170d08",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(23, 10, 6, 0.44)",
          }}
        >
          <span>Vol. I</span>
          <span>Field guide</span>
        </div>
        <BrandMark
          title=""
          style={{
            width: 178,
            height: 178,
          }}
        />
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
  const safeTitle = normalizeText(title, 54);
  const safeDefinition = normalizeText(definition, 180);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#ff5d2f",
        color: "#1a0904",
      }}
    >
      <BackgroundGlow />
      <Frame />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          padding: "82px 88px",
          gap: 72,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
          }}
        >
          <div
          style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 52,
                height: 52,
                borderRadius: 16,
                border: "1.5px solid rgba(32, 9, 4, 0.24)",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 700,
                color: "rgba(26, 9, 4, 0.9)",
              }}
            >
              {letter}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 17,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  opacity: 0.76,
                }}
              >
                The Devil&apos;s AI Dictionary
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  opacity: 0.56,
                }}
              >
                Dictionary entry
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              maxWidth: 560,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 64,
                lineHeight: 0.98,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                color: "#200904",
              }}
            >
              {safeTitle}
            </div>
            <div
              style={{
                display: "flex",
                width: 132,
                height: 2,
                background: "rgba(31, 9, 4, 0.28)",
              }}
            />
            <div
              style={{
                display: "flex",
                padding: "26px 28px 24px",
                borderRadius: 28,
                background: "rgba(24, 10, 6, 0.08)",
                border: "1px solid rgba(24, 10, 6, 0.12)",
                fontSize: 26,
                lineHeight: 1.5,
                color: "rgba(31, 9, 4, 0.86)",
                maxWidth: 560,
              }}
            >
              {safeDefinition}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 16,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.62,
            }}
          >
            Plain English with bite
          </div>
        </div>

        <div
          style={{
            width: 284,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 236,
              height: 384,
              borderRadius: 38,
              background: "rgba(23, 10, 6, 0.09)",
              border: "1px solid rgba(23, 10, 6, 0.12)",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 28px 46px rgba(22, 8, 4, 0.10)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 30,
                left: 30,
                right: 30,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(23, 10, 6, 0.42)",
              }}
            >
              <span>Term</span>
              <span>{letter}</span>
            </div>
            <BrandMark
              title=""
              style={{
                width: 154,
                height: 154,
                color: "#170b06",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
