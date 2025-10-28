import { Play } from "lucide-react";

export type Movie = {
  id: string | number;
  title: string;
  poster: string;   // full image URL
  year?: string | number;
};

export default function MovieGrid({
  movies,
  onPlay,
  className = "",
}: {
  movies: Movie[];
  onPlay?: (m: Movie) => void;
  className?: string;
}) {
  return (
    <section className={["mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className].join(" ")}>
      <h2 className="mb-4 text-lg font-semibold text-white/90">Other Videos</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {movies.slice(0, 4).map((m) => (
          <div
            key={m.id}
            className="group relative overflow-hidden rounded-xl bg-neutral-800 aspect-[2/3] shadow-lg"
            role="button"
            aria-label={`Open ${m.title}`}
            onClick={() => onPlay?.(m)}
          >
            <img
              src={m.poster}
              alt={m.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* hover overlay */}
            <div className="pointer-events-none absolute inset-0 bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* bottom bar */}
            <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{m.title}</div>
                {m.year && <div className="text-xs text-white/70">{m.year}</div>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(m);
                }}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition"
                aria-label={`Play ${m.title}`}
                title="Play"
              >
                <Play className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
