"use client";

import Image from "next/image";
import { useState } from "react";
import { GOOGLE_REVIEWS, SISTER_STUDIO } from "@/data/google-reviews";
import type { GoogleReview } from "@/data/google-reviews";

const GoogleG = () => <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" /><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" /></svg>;
const Stars = ({ rating }: { rating: number }) => <span className="greview-stars" role="img" aria-label={`${rating} out of 5 stars`}>{"★★★★★".slice(0, rating)}</span>;

function ReviewCard({ review }: { review: GoogleReview }) {
  const [open, setOpen] = useState(false);
  const long = review.text.length > 220;
  return <li className="greview">
    <div className="greview-head">
      <span className="greview-avatar" aria-hidden="true">{review.initials}</span>
      <div><b>{review.name}</b><small>{review.when}</small></div>
      <GoogleG />
    </div>
    <Stars rating={review.rating} />
    {review.title && <p className="greview-title">{review.title}</p>}
    {review.text && <p className={open || !long ? "greview-text" : "greview-text clamped"}>{review.text}</p>}
    {long && <button className="greview-more" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Show less" : "Read more"}</button>}
    <div className={`greview-photos count-${review.photos.length}`}>
      {review.photos.map((photo, index) => <span className="greview-photo" key={photo}><Image src={photo} alt={`Photo ${index + 1} by ${review.name}`} fill sizes="(max-width: 700px) 45vw, 220px" /></span>)}
    </div>
  </li>;
}

/** Real Google reviews of our sister studio, kept static. Labelled as Murtiverse's, so nobody mistakes them for Kalacar's own. */
export function GoogleReviews() {
  return <section className="greviews" aria-labelledby="greviews-title">
    <div className="greviews-inner">
      <div className="greviews-head">
        <p className="eyebrow">Google reviews</p>
        <h2 id="greviews-title">Loved by devotees</h2>
        <p>Real Google reviews of <b>{SISTER_STUDIO.name}</b>, our sister studio. Same hands, same care.</p>
        <p className="greviews-badge"><GoogleG /> <b>{SISTER_STUDIO.rating.toFixed(1)}</b> <Stars rating={5} /> <span>{SISTER_STUDIO.reviewCount} reviews on Google</span></p>
      </div>
      <ul className="greviews-grid">{GOOGLE_REVIEWS.map(review => <ReviewCard key={review.name} review={review} />)}</ul>
    </div>
  </section>;
}
