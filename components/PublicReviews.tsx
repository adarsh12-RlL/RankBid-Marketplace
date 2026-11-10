"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Review = { id: string; display_name: string; body: string; rating: number; created_at: string };

export default function PublicReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/feedback", { cache: "no-store" })
      .then(async response => response.ok ? response.json() : { items: [] })
      .then(data => { if (active) setReviews(Array.isArray(data.items) ? data.items.filter((item: Review) => item && typeof item.id === "string") : []); })
      .catch(() => { if (active) setReviews([]); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  return <section className="lens-public-reviews rankbid-feedback-reviews" aria-labelledby="lens-reviews-title">
    <div className="lens-public-reviews-heading">
      <span className="lens-eyebrow">CUSTOMER FEEDBACK</span>
      <h2 id="lens-reviews-title">What RankBid customers say</h2>
    </div>
    {!loaded ? <p className="rankbid-feedback-empty">Loading customer reviews…</p> : reviews.length ? <div className="rankbid-review-grid">{reviews.map(review => <article key={review.id} className="rankbid-review-card">
      <div className="rankbid-review-topline"><span>Customer review</span><span className="rankbid-review-stars" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map(value => <Star key={value} size={14} fill={value <= review.rating ? "currentColor" : "none"}/>)}</span></div>
      <p className="rankbid-review-body">{review.body}</p>
      <div className="rankbid-review-byline"><b>Verified customer</b><time>{new Date(review.created_at).toLocaleDateString()}</time></div>
    </article>)}</div> : <p className="rankbid-feedback-empty">No customer reviews yet.</p>}
  </section>;
}
