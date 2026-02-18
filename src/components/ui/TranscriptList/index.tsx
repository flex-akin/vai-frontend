import transcriptData from "../../../data/transcriptaud.json";

type TranscriptItem = {
  idx?: number;
  start_ms: number;
  end_ms?: number;
  text: string;
  sentiment?: { label: string; score: number };
};
type ApiTranscript = {
  language?: string;
  text?: string;
  segments?: TranscriptItem[];
  overall_sentiment?: any;
};

const itemsFromFixture: TranscriptItem[] = Array.isArray(transcriptData.segments)
  ? transcriptData.segments
  : [transcriptData.segments]; // robust if the JSON isn't an array

type Props = {
  transcript?: ApiTranscript | null;
};
const msToTimestamp = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = ms % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
};

export default function TranscriptList({ transcript }: Props) {
  // If `transcript` is explicitly null, render an empty placeholder (used by Watch page on load).
  if (transcript === null) {
    return <div className="text-sm text-zinc-500">No transcript yet. Click "Generate" to begin.</div>;
  }

  const items: TranscriptItem[] = transcript?.segments && transcript.segments.length ? transcript.segments : itemsFromFixture;

  return (
    <div className="space-y-3">
      {/* Optionally show overall transcript text if present */}
      {transcript?.text && (
        <div className="mb-2 text-sm text-zinc-200">{transcript.text}</div>
      )}

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
