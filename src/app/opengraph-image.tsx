import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #f4efe6 0%, #efe7da 46%, #ded6c6 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          color: "#231d17",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          Online book
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 700 }}>
            The Devil&apos;s AI Dictionary
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.45, maxWidth: "900px" }}>
            A sceptical field guide to AI language, hype, and operational reality.
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.78 }}>
          thedevilsaidictionary.com
        </div>
      </div>
    ),
    size,
  );
}
