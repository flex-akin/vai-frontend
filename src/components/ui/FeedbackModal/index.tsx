import { useState } from "react";
import { submitFeedback } from "../../../services/api/feedback";

interface FeedbackModalProps {
  userId: number;
  onClose: () => void;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  const labels = ["Terrible", "Bad", "Okay", "Good", "Amazing"];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <svg
                viewBox="0 0 24 24"
                className={[
                  "h-9 w-9 transition-colors duration-100",
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "fill-white/10 text-white/20",
                ].join(" ")}
                stroke="currentColor"
                strokeWidth={filled ? 0 : 1}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>
      <p className="h-5 text-sm font-medium text-white/50">
        {(hovered || value) > 0 ? labels[(hovered || value) - 1] : ""}
      </p>
    </div>
  );
}

export default function FeedbackModal({ userId, onClose }: FeedbackModalProps) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (stars === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitFeedback({
        user_id: userId,
        stars,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center px-4 pb-4 sm:pb-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl">
        {/* header */}
        <div className="relative h-px w-full bg-white/10" />
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Feedback</h2>
            <p className="text-xs text-white/40">Help us improve Aworan.ai</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">
                ⭐
              </div>
              <h3 className="text-base font-semibold text-white">Thank you!</h3>
              <p className="text-sm text-white/50">
                Your feedback means a lot to us.
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-xs text-white/60 underline underline-offset-2 hover:text-white transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <StarRating value={stars} onChange={setStars} />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Comment <span className="text-white/30">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you think…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit feedback"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
