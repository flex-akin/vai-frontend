export type ChatMsg = {
  id: string;
  ts: number;
  text?: string;
  role?: "user" | "assistant";
  audio?: {
    url: string;
    durationSec: number;
    mime?: string;
    filename?: string;
  };
};

const fmt = (s: number) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
};

export default function ChatHistory({ messages }: { messages: ChatMsg[] }) {
  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const isAudio = !!m.audio;
        return (
          <li
            key={m.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            {/* Header line (time, kind) */}
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
              <span>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span>•</span>
              <span>{isAudio ? "Voice note" : "Message"}</span>
              {isAudio && <span>• {fmt(m.audio!.durationSec)}</span>}
            </div>

            {/* Body */}
            {isAudio ? (
              <div className="flex items-center gap-3">
                <audio
                  controls
                  preload="metadata"
                  className="w-full"
                  src={m.audio!.url}
                />
                {/* Optional download button */}
                <a
                  href={m.audio!.url}
                  download={m.audio?.filename ?? "voice-note"}
                  className="text-xs text-zinc-300 underline decoration-dotted"
                >
                  download
                </a>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-zinc-100">
                {m.text}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
