/**
 * Brand logo — "פתרונות פיננסיים לישראל"
 *
 * Embedded inline (no separate image file) so it ships in the bundle and
 * renders 1:1 everywhere — including server-rendered HTML and any PDF export.
 *
 * NOTE: the emblem below is a faithful vector rebuild. To make it pixel-exact
 * to the original logo, drop the real file at `public/logo.png` and flip
 * `USE_IMAGE` to true (the <img> path is wired up below).
 */
import Image from "next/image";

const USE_IMAGE = false;

type Size = "sm" | "md" | "lg";

const ICON_PX: Record<Size, number> = { sm: 30, md: 46, lg: 58 };

function Emblem({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 120"
      role="img"
      aria-label="פתרונות פיננסיים לישראל"
      style={{ display: "block", flex: "none" }}
    >
      <defs>
        <linearGradient id="fhNavy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1c3358" />
          <stop offset=".55" stopColor="#102038" />
          <stop offset="1" stopColor="#0a1424" />
        </linearGradient>
        <linearGradient id="fhGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efd9a1" />
          <stop offset=".5" stopColor="#c8a45c" />
          <stop offset="1" stopColor="#9c7a31" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="114" height="114" rx="27" fill="url(#fhNavy)" />
      <rect
        x="9.5"
        y="9.5"
        width="101"
        height="101"
        rx="20.5"
        fill="none"
        stroke="#c8a45c"
        strokeOpacity=".55"
        strokeWidth="1.6"
      />
      <path
        d="M34 82 V34 H86 V86 H46 V50 H72 V70 H58"
        fill="none"
        stroke="url(#fhGold)"
        strokeWidth="6"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <circle cx="58" cy="70" r="3.4" fill="url(#fhGold)" />
    </svg>
  );
}

export default function Logo({
  size = "md",
  showText = true,
  className = "",
}: {
  size?: Size;
  showText?: boolean;
  className?: string;
}) {
  const px = ICON_PX[size];
  const mainSize = size === "lg" ? "1rem" : size === "md" ? "0.95rem" : "0.78rem";
  const subSize = size === "lg" ? "0.62rem" : size === "md" ? "0.6rem" : "0.5rem";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {USE_IMAGE ? (
        <Image
          src="/logo.png"
          alt="פתרונות פיננסיים לישראל"
          width={px}
          height={px}
          priority
          style={{ display: "block", flex: "none" }}
        />
      ) : (
        <Emblem px={px} />
      )}
      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <span
            className="font-extrabold text-ink"
            style={{ fontSize: mainSize }}
          >
            פתרונות פיננסיים לישראל
          </span>
          <span
            className="text-gold-light tracking-widest"
            style={{ fontSize: subSize, marginTop: 2 }}
          >
            ניהול משכנתאות ופיננסים
          </span>
        </div>
      )}
    </div>
  );
}