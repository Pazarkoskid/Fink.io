export default function Logo({ size = 36, withDot = true }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Black square with subtle rounded corner */}
      <rect x="0" y="0" width="84" height="84" rx="6" fill="#181712" />

      {/* F letter - serif/Fraunces style */}
      <text
        x="42"
        y="62"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="58"
        fontWeight="700"
        fill="#ff5b1f"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        F
      </text>

      {/* Orange dot in top right */}
      {withDot && (
        <circle cx="88" cy="12" r="9" fill="#ff5b1f" />
      )}
    </svg>
  )
}
