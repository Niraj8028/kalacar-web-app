"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
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

const SourceIcon = ({ kind }: { kind: "youtube" | "instagram" }) => kind === "instagram"
  ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r=".8" fill="currentColor" stroke="none" /></svg>
  : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5Z" fill="currentColor" /></svg>;

/** One tall video card. The cover comes from the video: YouTube's thumbnail, or Instagram's own embed, cropped to the video. */
function VideoCard({ review }: { review: Review }) {
  const { products } = useCart();
  const [playing, setPlaying] = useState(false);
  const video = videoEmbed(review.videoUrl);
  if (!video) return null;
  const product = products.find(item => item.id === review.productId);
  const youtubeId = video.kind === "youtube" ? video.src.split("/").pop() : "";
  const src = video.kind === "youtube" ? `${video.src}?autoplay=1&playsinline=1&rel=0` : video.src;
  const title = product?.name || review.author;
  const caption = review.text || (product ? review.author : review.city);
  return <li className="video-card-wrap">
    <div className={`video-card ${video.kind}`}>
      {(playing || video.kind === "instagram") && <iframe className={playing ? undefined : "video-card-preview"} src={src} title={`Video review from ${review.author}`} tabIndex={playing ? undefined : -1} aria-hidden={playing ? undefined : true} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" scrolling="no" />}
      {!playing && <button type="button" className="video-card-cover" aria-label={`Play video review: ${title}`} onClick={() => setPlaying(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail, not stored on this site */}
        {youtubeId && <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" />}
        <span className="video-card-source"><SourceIcon kind={video.kind} /></span>
        {video.kind === "youtube" && <span className="video-card-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5.5v13l11-6.5Z" /></svg></span>}
        <span className="video-card-text"><b>{title}</b>{caption && <small>{caption}</small>}</span>
      </button>}
    </div>
    {product && <Link className="video-card-link" href={`/products/${product.id}`}>View product <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>}
  </li>;
}

/** A row of matching video cards. Swipe on phones; arrows on larger screens. */
export function VideoRow({ reviews }: { reviews: Review[] }) {
  const row = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  const videos = reviews.filter(review => videoEmbed(review.videoUrl));
  const check = () => {
    const el = row.current;
    if (el) setEnds({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [videos.length]);
  if (!videos.length) return null;
  const move = (direction: number) => row.current?.scrollBy({ left: direction * (row.current.clientWidth * .8), behavior: "smooth" });
  return <div className="video-row-wrap">
    {!(ends.start && ends.end) && <div className="video-row-arrows">
      <button type="button" aria-label="Previous videos" disabled={ends.start} onClick={() => move(-1)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></button>
      <button type="button" aria-label="More videos" disabled={ends.end} onClick={() => move(1)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>
    </div>}
    <ul className="video-row" ref={row} onScroll={check}>{videos.map(review => <VideoCard key={review.id} review={review} />)}</ul>
  </div>;
}

export function ProductReviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  const written = reviews.filter(review => !videoEmbed(review.videoUrl) && (review.text || review.photos.length));
  return <section className="product-reviews" id="customer-reviews" aria-labelledby="customer-reviews-title">
    <h2 id="customer-reviews-title">Customer reviews and photos</h2>
    <RatingLine reviews={reviews} />
    <VideoRow reviews={reviews} />
    {written.length > 0 && <ul className="review-list">{written.map(review => <li className="review-card" key={review.id}>
      <Stars rating={review.rating} />
      {review.text && <p>{review.text}</p>}
      {review.photos.length > 0 && <div className="review-photos">{review.photos.map(photo => <span key={photo}><Image src={photo} alt={`Photo from ${review.author}`} fill sizes="96px" /></span>)}</div>}
      <small>{review.author}{review.city && `, ${review.city}`}</small>
    </li>)}</ul>}
  </section>;
}
