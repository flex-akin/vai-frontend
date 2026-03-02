import { useNavigate } from "react-router-dom";
import { ArrowLeft, Hammer } from "lucide-react";

interface UnderConstructionProps {
  pageName?: string;
}

export default function UnderConstruction({ pageName }: UnderConstructionProps) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-72 w-72 rounded-full bg-pink-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <Hammer className="h-9 w-9 text-white/70" strokeWidth={1.5} />
        </div>

        {/* Label */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
          Aworan.ai
        </p>

        {/* Heading */}
        <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl">
          {pageName ? (
            <>
              <span className="text-white/50">{pageName}</span>
              <br />
              is coming soon
            </>
          ) : (
            "Coming soon"
          )}
        </h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-white/50">
          We&apos;re putting the finishing touches on this feature. Check back
          soon — it&apos;ll be worth the wait.
        </p>

        {/* Divider */}
        <div className="mx-auto mb-8 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* CTA */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>
      </div>
    </div>
  );
}
