import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: 6,
        }}
      >
        S
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
