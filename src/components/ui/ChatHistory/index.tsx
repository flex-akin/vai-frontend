import { useEffect, useRef } from "react";

export type ChatMsg = { id: string; text: string; ts: number };

export default function ChatHistory({ messages }: { messages: ChatMsg[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl bg-[#222222] text-white px-4 py-2 shadow-sm">
            <p className="whitespace-pre-wrap text-sm">{m.text}</p>
            <span className="mt-1 block text-[10px] text-zinc-400">{fmt(m.ts)}</span>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}