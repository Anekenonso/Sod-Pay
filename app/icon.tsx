import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0B1D33",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          position: "relative",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10"
            stroke="#E8C547"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#E8C547" />
          <circle cx="12" cy="14.5" r="1.5" fill="#0B1D33" />
          <path
            d="M12 15.5V17.5"
            stroke="#0B1D33"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
