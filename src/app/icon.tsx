import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-static";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(140deg, #ff5b2c 0%, #ff6a31 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 28,
            border: "1px solid rgba(34, 12, 6, 0.22)",
          }}
        />
        <div
          style={{
            width: 304,
            height: 304,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 84,
            background: "rgba(26, 10, 6, 0.08)",
            color: "#140904",
            boxShadow: "0 36px 60px rgba(18, 8, 4, 0.22)",
          }}
        >
          <BrandMark
            title=""
            style={{
              width: 224,
              height: 224,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
