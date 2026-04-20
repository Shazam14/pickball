interface LogoSVGProps {
  width?: number
  className?: string
}

export default function LogoSVG({ width = 220, className }: LogoSVGProps) {
  return (
    <svg
      viewBox="0 0 440 130"
      width={width}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SideOut Pickleball"
    >
      {/* ── Player silhouette ── */}

      {/* Paddle */}
      <rect x="8" y="5" width="24" height="30" rx="5" fill="#22c55e" transform="rotate(-12 20 20)" />
      <rect x="15" y="34" width="11" height="20" rx="5" fill="#22c55e" transform="rotate(-12 20 44)" />

      {/* Arm */}
      <line x1="56" y1="42" x2="24" y2="18" stroke="#22c55e" strokeWidth="7" strokeLinecap="round" />

      {/* Green outer body blob */}
      <path
        d="M66 34 C54 42 38 56 26 72 C17 85 14 100 22 108 C32 118 50 112 64 100 C76 89 82 72 80 54 C78 40 72 28 66 34Z"
        fill="#22c55e"
      />

      {/* Black S-curve body */}
      <path
        d="M69 36 C57 45 42 60 32 76 C25 89 25 104 35 110 C46 116 62 108 72 96 C82 84 86 66 82 50Z"
        fill="#111111"
      />

      {/* Head */}
      <circle cx="74" cy="22" r="12" fill="#111111" />

      {/* Cap visor */}
      <polygon points="83,17 104,14 83,26" fill="#111111" />

      {/* Legs */}
      <path d="M22 100 L6 126" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" />
      <path d="M28 106 L14 130" stroke="#111111" strokeWidth="7" strokeLinecap="round" />

      {/* ── Pickleball ── */}
      <circle cx="104" cy="84" r="42" fill="#22c55e" />

      {/* Outer ring of holes */}
      <circle cx="84" cy="66" r="6" fill="#000000" opacity="0.45" />
      <circle cx="105" cy="59" r="6" fill="#000000" opacity="0.45" />
      <circle cx="124" cy="68" r="6" fill="#000000" opacity="0.45" />
      <circle cx="132" cy="85" r="6" fill="#000000" opacity="0.45" />
      <circle cx="123" cy="102" r="6" fill="#000000" opacity="0.45" />
      <circle cx="104" cy="110" r="6" fill="#000000" opacity="0.45" />
      <circle cx="84" cy="102" r="6" fill="#000000" opacity="0.45" />
      <circle cx="75" cy="85" r="6" fill="#000000" opacity="0.45" />

      {/* Inner ring of holes */}
      <circle cx="96" cy="75" r="4.5" fill="#000000" opacity="0.3" />
      <circle cx="112" cy="74" r="4.5" fill="#000000" opacity="0.3" />
      <circle cx="118" cy="88" r="4.5" fill="#000000" opacity="0.3" />
      <circle cx="109" cy="100" r="4.5" fill="#000000" opacity="0.3" />
      <circle cx="95" cy="100" r="4.5" fill="#000000" opacity="0.3" />
      <circle cx="89" cy="88" r="4.5" fill="#000000" opacity="0.3" />

      {/* ── SIDEOUT text ── */}
      <text
        x="158"
        y="90"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="900"
        fontSize="82"
        fill="white"
        letterSpacing="2"
      >
        SIDEOUT
      </text>

      {/* ── PICKLEBALL subtext ── */}
      <text
        x="162"
        y="118"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="700"
        fontSize="26"
        fill="#22c55e"
        letterSpacing="8"
      >
        PICKLEBALL
      </text>
    </svg>
  )
}
