interface LogoProps {
  size?: number;
}

export function Logo({ size = 30 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Mathly logo"
    >
      <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--accent)" />
      <path
        d="M8 26 C 13 26, 15 12, 20 12 S 27 30, 32 30"
        stroke="var(--on-accent)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="12" r="2.6" fill="var(--gold)" />
      <circle cx="32" cy="30" r="2.6" fill="var(--gold)" />
    </svg>
  );
}