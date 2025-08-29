import transcriptData from "../../../data/transcriptaud.json";

type TranscriptItem = {
  idx?: number;
  start_ms: number;
  end_ms?: number;
  text: string;
  sentiment?: { label: string; score: number };
};

const items: TranscriptItem[] = Array.isArray(transcriptData.segments)
  ? transcriptData.segments
  : [transcriptData.segments]; // robust if the JSON isn't an array

const msToTimestamp = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = ms % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
};

export default function TranscriptList() {
  return (
    <div className="space-y-3">
      {items.map((seg, i) => (
        <div key={seg.idx ?? i} className="flex items-start gap-3">
          <span className="shrink-0 tabular-nums text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
            {msToTimestamp(seg.start_ms)}
          </span>
          <p className="text-sm leading-relaxed text-zinc-100">{seg.text}</p>
        </div>
      ))}
    </div>
  );
}
