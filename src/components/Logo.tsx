/** Original Globe Explorer mark: a globe with a journey arc between a visited and a wishlist point. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="logo-sphere" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cc4f2" />
          <stop offset="1" stopColor="#1570e3" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="15" fill="url(#logo-sphere)" />
      <path d="M12 11c3 1 5 4 4 7s-4 3-5 6c-.6 2 .2 4 1.4 5.6A15 15 0 0 1 12 11Z" fill="#ffffff" />
      <path d="M24 7.6c2 1.4 2.3 3.7 4.6 4.2 2.2.5 3.8 2.6 4.6 5A15 15 0 0 0 24 7.6Z" fill="#43be8b" />
      <ellipse cx="20" cy="20" rx="6.5" ry="15" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
      <path d="M9 27c5-9 13-14 22-14" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.2 2.6" />
      <circle cx="9" cy="27" r="2.6" fill="#188560" stroke="#fff" strokeWidth="1.2" />
      <rect x="28.4" y="10.4" width="5.2" height="5.2" rx="1" transform="rotate(45 31 13)" fill="#c47820" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}
