type RankBidMarkProps = {
  size?: number;
  className?: string;
};

/** Original RankBid identity mark, drawn as two rising folded paths and a beacon. */
export default function RankBidMark({ size = 28, className = "" }: RankBidMarkProps) {
  return <svg
    className={`rankbid-mark ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="m4.5 21.5 6.2-6.2 4.3 4.3 10.4-10.4" stroke="#e87556" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m4.5 27.5 6.2-6.2 4.3 4.3 6.2-6.2" stroke="#438fe0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.5 9.2h5.5v5.5" stroke="#e87556" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="26" cy="6.5" r="3" fill="#ef8a43" />
  </svg>;
}
