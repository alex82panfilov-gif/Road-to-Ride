import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f5f5f7",
        color: "#1d1d1f",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28 }}>Первая машина</div>
      <div style={{ fontSize: 68, lineHeight: 1.15, maxWidth: 900 }}>Накопить на спокойный автомат и понять, чего ждать</div>
    </div>,
    size,
  );
}
