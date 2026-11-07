/** The product mark: three readings threaded into one finding. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <defs>
        <linearGradient id="mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2B5CE6" />
          <stop offset="1" stopColor="#12A994" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="url(#mark-fill)" />
      <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <path d="M8 8.5c5 0 6 5.5 11 5.5M8 14h11M8 19.5c5 0 6-5.5 11-5.5" />
      </g>
      <g fill="#fff">
        <circle cx="7.5" cy="8.5" r="1.7" />
        <circle cx="7.5" cy="14" r="1.7" />
        <circle cx="7.5" cy="19.5" r="1.7" />
        <circle cx="19.5" cy="14" r="2.8" />
      </g>
    </svg>
  );
}
