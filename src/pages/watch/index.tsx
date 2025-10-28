// components/ui/VoiceControlBar.tsx
import { useEffect, useRef, useState } from "react";
import { Mic, PauseCircle, PlayCircle } from "lucide-react";
import Player from "../../components/ui/VideoPlayer";
import TranscriptList from "../../components/ui/TranscriptList";
import MovieGrid from "../../components/ui/MovieGrid";
import { transcribeVideoFile } from "../../services/utils/transcribeFromVideo";
import { getTranscript } from "../../services/api/transcript";
import type { TranscribeFromVideoOptions } from "../../services/utils/transcribeFromVideo";
import type { TranscriptResponse } from "../../services/api/transcript";
import Loader from "../../components/ui/Loader";

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
  const [level, setLevel] = useState(0); // 0-100

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
      // meter is optional
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
    for (const t of types) {
      if (MediaRecorder.isTypeSupported?.(t)) return t;
    }
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
      const rec = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) =>
        e.data?.size && chunksRef.current.push(e.data);

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
        const file = new File([blob], `recording-${Date.now()}.${ext}`, {
          type,
        });
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

const fmt = (s: number) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
};

export const demoMovies = [
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

export default function Watch(props: {
  onVoiceEvent?: (e: VoiceEvent) => void;
}) {
  const { onVoiceEvent } = props;
  // refs to target the player's internal <video> and store playback state while using the dummy
  const playerWrapRef = useRef<HTMLDivElement | null>(null);
  const savedTimeRef = useRef<number | null>(null);
  const wasPlayingRef = useRef<boolean | null>(null);
  const originalSrcRef = useRef<string | null>(null);

  // handler: do nothing when recording starts; when recording stops, switch to a dummy
  // video, play it, then restore the original video and seek back to where it stopped
  const handleVoiceEvent = (e: VoiceEvent) => {
    // forward to any external handler passed to the component
    onVoiceEvent?.(e);

    const videoEl = playerWrapRef.current?.querySelector(
      "video"
    ) as HTMLVideoElement | null;
    if (!videoEl) return;

    const dummyUrl =
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

    if (e.type === "recording-start") {
      // intentionally leave playback alone while recording
      savedTimeRef.current = null;
      wasPlayingRef.current = null;
      originalSrcRef.current = null;
      return;
    }

    if (e.type === "recording-stop") {
      try {
        // capture current playhead and playing state immediately before swapping
        savedTimeRef.current = Number(videoEl.currentTime || 0);
        wasPlayingRef.current = !videoEl.paused && !videoEl.ended;
      } catch {
        savedTimeRef.current = null;
        wasPlayingRef.current = null;
      }

      try {
        // store original src so we can restore it later
        originalSrcRef.current = videoEl.currentSrc || (videoEl.src || null);
      } catch {
        originalSrcRef.current = null;
      }

      // asynchronously send the recorded audio to the transcription endpoint
      // (fire-and-forget — we don't block swapping the dummy video)
      (async () => {
        try {
          setRecordedFile(e.file);
          const recRes = await getTranscript(e.file, { model: "whisper-1", language: "en" });
          setRecordedTranscript(recRes ?? null);
        } catch (err) {
          console.error("Recorded audio transcription failed", err);
        }
      })();

      const onDummyEnded = () => {
        try {
          // restore original src
          if (originalSrcRef.current) {
            // pause dummy first
            videoEl.pause();
            videoEl.src = originalSrcRef.current;
            videoEl.load();

            const restoreAfterLoad = () => {
              try {
                if (savedTimeRef.current != null) {
                  // seek back to where original video was when recording stopped
                  videoEl.currentTime = savedTimeRef.current;
                }
              } catch {}

              try {
                if (wasPlayingRef.current) {
                  void videoEl.play().catch(() => {});
                }
              } catch {}

              // cleanup
              savedTimeRef.current = null;
              wasPlayingRef.current = null;
              originalSrcRef.current = null;
              videoEl.removeEventListener("loadedmetadata", restoreAfterLoad);
            };

            if (videoEl.readyState >= 1) {
              // metadata already available
              restoreAfterLoad();
            } else {
              videoEl.addEventListener("loadedmetadata", restoreAfterLoad);
            }
          }
        } catch {}

        videoEl.removeEventListener("ended", onDummyEnded);
      };

      try {
        // switch to dummy and play
        videoEl.pause();
        videoEl.src = dummyUrl;
        videoEl.load();
        // ensure we remove any previous handler and attach ours
        videoEl.removeEventListener("ended", onDummyEnded);
        videoEl.addEventListener("ended", onDummyEnded);
        void videoEl.play().catch(() => {});
      } catch {
        // if swapping fails, attempt best-effort restore
        try {
          if (originalSrcRef.current) {
            videoEl.src = originalSrcRef.current;
            videoEl.load();
          }
        } catch {}
        savedTimeRef.current = null;
        wasPlayingRef.current = null;
        originalSrcRef.current = null;
      }
    }
  };

  const { isRecording, isPaused, elapsed, level, start, stop, pause, resume } =
    useVoiceRecorder({ onEvent: handleVoiceEvent });

  const [apiTranscript, setApiTranscript] = useState<TranscriptResponse | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedTranscript, setRecordedTranscript] = useState<TranscriptResponse | null>(null);

  // helper to fetch the hard-coded sample video and transcribe it
  const transcribeSampleVideo = async (opts: TranscribeFromVideoOptions = {}) => {
    setIsTranscribing(true);
    try {
      // sample video path used by the Player component
      const resp = await fetch("/src/data/samplevid.mp4");
      const blob = await resp.blob();
      const file = new File([blob], "samplevid.mp4", { type: blob.type || "video/mp4" });
      // forward progress to the hook UI
      const mergedOpts: TranscribeFromVideoOptions = {
        ...opts,
        onProgress: (m: string) => {
          console.debug("transcribe progress:", m);
        },
      };

      const res = await transcribeVideoFile(file, mergedOpts);
      setApiTranscript(res ?? null);
      return res;
    } catch (err) {
      console.error("transcribe sample error", err);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <>
      <div className="flex">
        <div className="w-3/4 flex flex-col min-h-[96vh]">
          {/* <h1 className="text-2xl font-bold p-4">Welcome to VideoAI</h1> */}

          <div className="flex flex-col flex-1 min-h-0 items-center">
            <div className="flex justify-center items-center">
              {/* wrap Player so we can target its internal <video> element */}
              <div ref={playerWrapRef}>
                <Player />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col items-center mt-6">
            {/* Transcribe button moved to the Transcript panel header */}
            <MovieGrid
              movies={demoMovies}
              onPlay={(m) => console.log("Play clicked:", m.title)}
              className="mt-10"
            />
          </div>
        </div>

        <div className="w-1/4 m-4 bg-[#181818] rounded-2xl overflow-y-auto h-[96vh] p-4">
          <div className="m-2 rounded-4xl"></div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Transcript</h2>
            <div>
              <button
                onClick={() => transcribeSampleVideo({ format: "mp3" }).catch(() => {})}
                className="rounded-md bg-green-600 hover:bg-green-500 text-white px-2 py-1 flex items-center gap-2 text-sm"
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <>
                    <Loader /> Transcribing…
                  </>
                ) : (
                  "Generate"
                )}
              </button>
            </div>
          </div>
          {isTranscribing ? (
            <div className="flex items-center gap-2"><Loader /> <span className="text-sm text-zinc-400">Transcribing…</span></div>
          ) : (
            <TranscriptList transcript={apiTranscript} />
          )}
          {/* Recorded audio panel */}
          <div className="mt-6 border-t border-white/5 pt-4">
            <h3 className="text-sm font-medium mb-2">Last recording</h3>
            {recordedFile ? (
              <div className="space-y-2">
                <audio controls src={URL.createObjectURL(recordedFile)} className="w-full" />
                {recordedTranscript ? (
                  <div className="text-sm text-zinc-100 mt-2">
                    {/* if overall text exists show it */}
                    {recordedTranscript.text && <div className="mb-2">{recordedTranscript.text}</div>}
                    {/* render segment list if present */}
                    {Array.isArray(recordedTranscript.segments) && recordedTranscript.segments.map((s: any, i: number) => (
                      <div key={i} className="text-sm text-zinc-300">{s.text}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">Uploading / transcribing…</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No recent recording</div>
            )}
          </div>
        </div>
      </div>

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
                  aria-label={isPaused ? "Resume" : "Pause"}
                  title={isPaused ? "Resume" : "Pause"}
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
                  aria-label="Stop"
                  title="Stop"
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
