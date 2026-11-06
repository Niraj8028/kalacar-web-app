"use client";

import Image from "next/image";
import { reviewSummary, videoEmbed } from "@/data/site-content";
import type { Review } from "@/data/site-content";

export function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return <span className="stars" role="img" aria-label={`${rating} out of 5`}>{[1, 2, 3, 4, 5].map(n => <svg key={n} viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className={n <= rounded ? "star on" : "star"}><path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 17l-5.6 3.2 1.3-6.3L3 9.6l6.3-.7z" /></svg>)}</span>;
}

/** Shown only when there are real reviews. */
export function RatingLine({ reviews }: { reviews: Review[] }) {
  const summary = reviewSummary(reviews);
  if (!summary) return null;
  return <a className="rating-line" href="#customer-reviews"><Stars rating={summary.average} /><span>{summary.average.toFixed(1)} ({summary.count} {summary.count === 1 ? "review" : "reviews"})</span></a>;
}

export function VideoReview({ review }: { review: Review }) {
  const video = videoEmbed(review.videoUrl);
  if (!video) return null;
  return <figure className={`video-review ${video.kind}`}>
    <iframe src={video.src} title={`Video review from ${review.author}`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" />
    <figcaption>{review.author}{review.city && `, ${review.city}`}</figcaption>
  </figure>;
}

export function ProductReviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return <section className="product-reviews" id="customer-reviews" aria-labelledby="customer-reviews-title">
    <h2 id="customer-reviews-title">Customer reviews and photos</h2>
    <RatingLine reviews={reviews} />
    <ul className="review-list">{reviews.map(review => <li className="review-card" key={review.id}>
      <Stars rating={review.rating} />
      {review.text && <p>{review.text}</p>}
      {review.photos.length > 0 && <div className="review-photos">{review.photos.map(photo => <span key={photo}><Image src={photo} alt={`Photo from ${review.author}`} fill sizes="96px" /></span>)}</div>}
      <VideoReview review={review} />
      <small>{review.author}{review.city && `, ${review.city}`}</small>
    </li>)}</ul>
  </section>;
}
