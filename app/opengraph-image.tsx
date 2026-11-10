import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RankBid — Discover products. Choose your placement.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #03060f 0%, #0b152d 50%, #03060f 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#b84226",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: "bold",
            }}
          >
            📈
          </div>
          <span style={{ fontSize: "56px", fontWeight: "900", letterSpacing: "-1px" }}>
            RankBid
          </span>
        </div>
        <p
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
            margin: "0 0 32px 0",
          }}
        >
          A transparent paid-product leaderboard. Discover top products & verified rank placements.
        </p>
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "9999px",
              padding: "10px 24px",
              fontSize: "18px",
              color: "#38bdf8",
            }}
          >
            Verified Payments
          </div>
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "9999px",
              padding: "10px 24px",
              fontSize: "18px",
              color: "#4ade80",
            }}
          >
            Live Leaderboard
          </div>
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "9999px",
              padding: "10px 24px",
              fontSize: "18px",
              color: "#fb923c",
            }}
          >
            24/7 Realtime Analytics
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
