export default function BloomMascot({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Petals */}
      <ellipse cx="40" cy="18" rx="8" ry="13" fill="#F9A8D4" opacity="0.9" />
      <ellipse cx="60" cy="30" rx="13" ry="8" fill="#F9A8D4" opacity="0.9" transform="rotate(-30 60 30)" />
      <ellipse cx="62" cy="54" rx="13" ry="8" fill="#F9A8D4" opacity="0.9" transform="rotate(30 62 54)" />
      <ellipse cx="40" cy="64" rx="8" ry="13" fill="#F9A8D4" opacity="0.9" />
      <ellipse cx="18" cy="54" rx="13" ry="8" fill="#F9A8D4" opacity="0.9" transform="rotate(-30 18 54)" />
      <ellipse cx="20" cy="30" rx="13" ry="8" fill="#F9A8D4" opacity="0.9" transform="rotate(30 20 30)" />
      {/* Center face */}
      <circle cx="40" cy="42" r="18" fill="#FEF3C7" />
      <circle cx="40" cy="42" r="18" fill="url(#bloomFaceGrad)" />
      {/* Eyes */}
      <circle cx="34.5" cy="39" r="2.8" fill="#6E3482" />
      <circle cx="45.5" cy="39" r="2.8" fill="#6E3482" />
      <circle cx="35.3" cy="38.1" r="1.1" fill="white" />
      <circle cx="46.3" cy="38.1" r="1.1" fill="white" />
      {/* Smile */}
      <path d="M33.5 46 Q40 52 46.5 46" stroke="#6E3482" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Rosy cheeks */}
      <circle cx="30.5" cy="44.5" r="4" fill="#FCA5A5" opacity="0.45" />
      <circle cx="49.5" cy="44.5" r="4" fill="#FCA5A5" opacity="0.45" />
      <defs>
        <radialGradient id="bloomFaceGrad" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FDE68A" />
        </radialGradient>
      </defs>
    </svg>
  );
}
