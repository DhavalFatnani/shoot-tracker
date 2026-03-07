import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          borderRadius: 8,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 32 32"
          fill="none"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="28" height="28" rx="7" />
          <path d="M9 21l6-6 8-6" strokeWidth="2" />
        </svg>
      </div>
    ),
    {
      width: 32,
      height: 32,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
      },
    }
  );
}
