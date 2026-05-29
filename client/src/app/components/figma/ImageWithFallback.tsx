// components/figma/ImageWithFallback.tsx
// Tự động thêm API_URL vào ảnh từ server (/uploads/...)
// Fallback hiển thị icon người khi ảnh lỗi

import { useState } from "react";

const API_URL = (
  ((import.meta as any).env.VITE_API_URL as string) || "https://vananhcs-face-id.hf.space"
).replace(/\/+$/, "");

function resolveUrl(src: string | undefined | null): string {
  if (!src) return "";
  // Đã là URL đầy đủ (http/https hoặc base64) → giữ nguyên
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  // Đường dẫn tương đối /uploads/... → thêm API_URL
  return `${API_URL}${src.startsWith("/") ? src : `/${src}`}`;
}

interface Props {
  src?: string | null;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function ImageWithFallback({ src, alt = "", style, className }: Props) {
  const [error, setError] = useState(false);
  const resolved = resolveUrl(src);

  if (!resolved || error) {
    // Fallback: icon người
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(0,212,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        <svg
          width="40%"
          height="40%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(0,212,255,0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
}
