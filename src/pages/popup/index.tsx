import { useEffect, useRef, useState } from "react";
import { Mic, PauseCircle, PlayCircle, X } from "lucide-react";
import Player from "../../components/ui/VideoPlayer";
import TranscriptList from "../../components/ui/TranscriptList";
import MovieGrid from "../../components/ui/MovieGrid";

// ---- TYPES ----
export type VoiceEvent =
  | { type: "recording-start" }
  | { type: "recording-progress"; elapsed: number }
  | { type: "recording-pause"; elapsed: number }
  | { type: "recording-resume"; elapsed: number }
  | {
      type: "recording-stop";
      file: File;
      blob: Blob;
      url: string;
      durationSec: number;
    }
  | { type: "recording-error"; message: string };


function useVoiceRecorder(
  opts: { maxSeconds?: number; onEvent?: (e: VoiceEvent) => void } = {}
) {
  const { maxSeconds = 180, onEvent } = opts;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startMeter = (stream: MediaStream) => {
    try {
      // @ts-expect-error
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      const tick = () => {
        analyserRef.current!.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(100, Math.round((rms / 255) * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // ignore
    }
  };

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close();
    } catch {}
    sourceRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    setLevel(0);
  };

  const startTimer = () => {
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setElapsed(s);
      onEvent?.({ type: "recording-progress", elapsed: s });
      if (maxSeconds && s >= maxSeconds) stop();
    }, 250);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const pickMime = () => {
    if (typeof MediaRecorder === "undefined") return "";
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const t of types) if (MediaRecorder.isTypeSupported?.(t)) return t;
    return "";
  };

  useEffect(
    () => () => {
      try {
        if (recRef.current && recRef.current.state !== "inactive")
          recRef.current.stop();
      } catch {}
      stopTimer();
      stopMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      chunksRef.current = [];
    },
    []
  );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => e.data?.size && chunksRef.current.push(e.data);

      rec.onstop = () => {
        stopTimer();
        stopMeter();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];

        const ext = type.includes("mp4")
          ? "m4a"
          : type.includes("webm")
          ? "webm"
          : type.includes("ogg")
          ? "ogg"
          : "wav";
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type });
        const url = URL.createObjectURL(blob);

        onEvent?.({
          type: "recording-stop",
          file,
          blob,
          url,
          durationSec: elapsed,
        });
        setElapsed(0);
      };

      startMeter(stream);
      rec.start();
      startTimer();
      setIsRecording(true);
      setIsPaused(false);
      onEvent?.({ type: "recording-start" });
    } catch (e: any) {
      onEvent?.({
        type: "recording-error",
        message: e?.message || "Mic denied/unavailable",
      });
    }
  };

  const stop = () => {
    try {
      if (recRef.current && recRef.current.state !== "inactive")
        recRef.current.stop();
    } catch {}
    setIsRecording(false);
    setIsPaused(false);
  };

  const pause = () => {
    const r = recRef.current;
    if (r?.state === "recording") {
      r.pause();
      setIsPaused(true);
      stopTimer();
      onEvent?.({ type: "recording-pause", elapsed });
    }
  };

  const resume = () => {
    const r = recRef.current;
    if (r?.state === "paused") {
      r.resume();
      setIsPaused(false);
      startTimer();
      onEvent?.({ type: "recording-resume", elapsed });
    }
  };

  return { isRecording, isPaused, elapsed, level, start, stop, pause, resume };
}

// ---- HELPER ----
const fmt = (s: number) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
};

// ---- DEMO MOVIES ----
const demoMovies = [
  {
    id: 1,
    title: "Dune: Part Two",
    year: 2024,
    poster: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
  },
  {
    id: 2,
    title: "Inception",
    year: 2010,
    poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  },
  {
    id: 3,
    title: "Top Gun: Maverick",
    year: 2022,
    poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
  },
  {
    id: 4,
    title: "Spider-Verse",
    year: 2023,
    poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  },
];

// ---- MAIN COMPONENT ----
export default function Popup(props: { onVoiceEvent?: (e: VoiceEvent) => void }) {
  const { onVoiceEvent } = props;
  const playerWrapRef = useRef<HTMLDivElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dummyUrl] = useState(
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
  );

  const savedTimeRef = useRef<number | null>(null);
  const wasPlayingRef = useRef<boolean | null>(null);

  const handleVoiceEvent = (e: VoiceEvent) => {
    onVoiceEvent?.(e);
    const videoEl = playerWrapRef.current?.querySelector("video") as HTMLVideoElement | null;
    if (!videoEl) return;

    if (e.type === "recording-stop") {
      try {
        savedTimeRef.current = Number(videoEl.currentTime || 0);
        wasPlayingRef.current = !videoEl.paused && !videoEl.ended;
        videoEl.pause();
      } catch {}
      setShowModal(true);
    }
  };

  const onDummyVideoEnded = () => {
    setShowModal(false);
    const videoEl = playerWrapRef.current?.querySelector("video") as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.currentTime = savedTimeRef.current || 0;
      if (wasPlayingRef.current) void videoEl.play().catch(() => {});
    }
    savedTimeRef.current = null;
    wasPlayingRef.current = null;
  };

  const { isRecording, isPaused, elapsed, level, start, stop, pause, resume } =
    useVoiceRecorder({ onEvent: handleVoiceEvent });

  return (
    <>
      <div className="flex">
        <div className="w-3/4 flex flex-col min-h-[96vh]">
          <div className="flex justify-center items-center">
            <div ref={playerWrapRef}>
              <Player />
            </div>
          </div>
          <MovieGrid
            movies={demoMovies}
            onPlay={(m) => console.log("Play clicked:", m.title)}
            className="mt-10"
          />
        </div>

        <div className="w-1/4 m-4 bg-[#181818] rounded-2xl overflow-y-auto h-[96vh] p-4">
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <TranscriptList />
        </div>
      </div>

      {/* MODAL FOR SECOND VIDEO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative w-[80%] max-w-3xl">
            <button
              onClick={onDummyVideoEnded}
              className="absolute top-2 right-2 bg-black/40 hover:bg-black/70 text-white rounded-full p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <video
              src={dummyUrl}
              autoPlay
              onEnded={onDummyVideoEnded}
              className="rounded-2xl w-full shadow-lg"
              controls={false}
            />
          </div>
        </div>
      )}

      {/* VOICE CONTROL BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-3 rounded-2xl bg-black/70 backdrop-blur px-4 py-3 shadow-xl border border-white/10">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
            <div className="w-28 text-center text-xs text-white/80 tabular-nums">
              {isRecording
                ? isPaused
                  ? `Paused ${fmt(elapsed)}`
                  : `Rec ${fmt(elapsed)}`
                : "Press to speak"}
            </div>
            <div className="h-2 w-32 bg-white/10 rounded overflow-hidden">
              <div
                className="h-full bg-white/70 transition-[width]"
                style={{ width: `${level}%` }}
              />
            </div>
            {!isRecording ? (
              <button
                onClick={start}
                className="rounded-full bg-red-600 hover:bg-red-500 p-2"
                aria-label="Start recording"
                title="Start recording"
              >
                <Mic className="h-5 w-5 text-white" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={isPaused ? resume : pause}
                  className="rounded-full bg-white/10 hover:bg-white/20 p-2"
                >
                  {isPaused ? (
                    <PlayCircle className="h-5 w-5 text-white" />
                  ) : (
                    <PauseCircle className="h-5 w-5 text-white" />
                  )}
                </button>
                <button
                  onClick={stop}
                  className="rounded-full bg-red-600 hover:bg-red-500 px-3 py-2 text-sm text-white"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
