import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeedback, type FeedbackEntry } from "../../services/api/feedback";

function StarDisplay({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 24 24"
          className={[
            "h-3.5 w-3.5",
            s <= stars
              ? "fill-amber-400 text-amber-400"
              : "fill-white/10 text-white/20",
          ].join(" ")}
          stroke="currentColor"
          strokeWidth={s <= stars ? 0 : 1}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeedback()
      .then(setEntries)
      .catch(() => setError("Could not load feedback."))
      .finally(() => setLoading(false));
  }, []);

  const avg =
    entries.length > 0
      ? entries.reduce((s, e) => s + e.stars, 0) / entries.length
      : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Feedback</h1>
            <p className="text-sm text-white/40">All user reviews</p>
          </div>
        </div>

        {loading && (
          <div className="flex h-48 items-center justify-center text-sm text-white/40">
            Loading…
          </div>
        )}

        {error && (
          <div className="flex h-48 items-center justify-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-white/40">
            <span className="text-3xl">💬</span>
            No feedback yet.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Summary */}
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
              <span className="text-4xl font-bold text-amber-400">{avg.toFixed(1)}</span>
              <div>
                <StarDisplay stars={Math.round(avg)} />
                <p className="mt-1 text-sm text-white/40">
                  {entries.length} review{entries.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Stars</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 last:border-0 hover:bg-white/5 transition"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium leading-tight">
                          {e.first_name} {e.last_name}
                        </p>
                        <p className="text-xs text-white/40">{e.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StarDisplay stars={e.stars} />
                      </td>
                      <td className="px-4 py-3 text-white/70 max-w-xs">
                        {e.comment ? (
                          <span>"{e.comment}"</span>
                        ) : (
                          <span className="text-white/25 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
