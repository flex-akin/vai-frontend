import { useState, useRef, useEffect } from "react";
import { Mic, Plus, Send } from "lucide-react";

/** Events ChatInput can emit upward */
// components/ui/ChatInput.tsx
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
  opts: {
    maxSeconds?: number;
    onStop?: (file: File, blob: Blob, durationSec: number) => void;
    onStart?: () => void;
    onPause?: (elapsed: number) => void;
    onResume?: (elapsed: number) => void;
    onProgress?: (elapsed: number) => void;
    onError?: (message: string) => void;
  } = {}
) {
  const {
    maxSeconds = 180,
    onStop,
    onStart,
    onPause,
    onResume,
    onProgress,
    onError,
  } = opts;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  let audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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

  const startMeter = (stream: MediaStream) => {
    try {
      // @ts-expect-error webkit fallback
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
    } catch {}
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
    // @ts-expect-error help GC
    audioCtxRef = null;
    setLevel(0);
  };

  const startTimer = () => {
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setElapsed(s);
      onProgress?.(s);
      if (maxSeconds && s >= maxSeconds) stop();
    }, 250);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanup = () => {
    stopTimer();
    stopMeter();
    try {
      if (recRef.current && recRef.current.state !== "inactive")
        recRef.current.stop();
    } catch {}
    recRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setElapsed(0);
  };

  useEffect(() => () => cleanup(), []);

  const start = async () => {
    setError(null);
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

        const durationSec = elapsed; // capture before we reset elapsed
        onStop?.(file, blob, durationSec);
        setElapsed(0);
      };

      startMeter(stream);
      rec.start();
      startTimer();
      setIsRecording(true);
      setIsPaused(false);
      onStart?.();
    } catch (e: any) {
      const msg = e?.message || "Microphone permission denied or unavailable.";
      setError(msg);
      onError?.(msg);
      cleanup();
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
      onPause?.(elapsed);
    }
  };
  const resume = () => {
    const r = recRef.current;
    if (r?.state === "paused") {
      r.resume();
      setIsPaused(false);
      startTimer();
      onResume?.(elapsed);
    }
  };

  return {
    isRecording,
    isPaused,
    elapsed,
    level,
    error,
    start,
    stop,
    pause,
    resume,
  };
}

const ChatInput = ({
  onSend,
  onVoiceEvent,
}: {
  onSend: (text: string) => void;
  onVoiceEvent?: (ev: VoiceEvent) => void;
}) => {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fmt = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  };

  const {
    isRecording,
    isPaused,
    elapsed,
    level,
    error,
    start,
    stop,
    pause,
    resume,
  } = useVoiceRecorder({
    maxSeconds: 180,
    onStart: () => onVoiceEvent?.({ type: "recording-start" }),
    onPause: (e) => onVoiceEvent?.({ type: "recording-pause", elapsed: e }),
    onResume: (e) => onVoiceEvent?.({ type: "recording-resume", elapsed: e }),
    onProgress: (e) =>
      onVoiceEvent?.({ type: "recording-progress", elapsed: e }),
    onError: (m) => onVoiceEvent?.({ type: "recording-error", message: m }),
    onStop: async (file, blob, durationSec) => {
      const url = URL.createObjectURL(file);
      onVoiceEvent?.({ type: "recording-stop", file, blob, url, durationSec });
    },
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
      setIsExpanded(textarea.scrollHeight > 50);
    }
  }, [message]);

  const submit = () => {
    const text = message.trim();
    if (!text) return;
    onSend(text);
    setMessage("");
  };

  return (
    <div className="w-full">
      <div
        className={`w-full flex items-end gap-2 bg-white dark:bg-[#181818] p-3 border shadow-sm transition-all duration-300 ${
          isExpanded ? "rounded-xl" : "rounded-full"
        }`}
      >
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <Plus size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          style={{ maxHeight: "400px", overflowY: "auto" }}
        />

        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={() => (isRecording ? stop() : start())}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          title={isRecording ? "Stop recording" : "Record voice message"}
        >
          <Mic size={20} />
        </button>

        <button
          className="text-gray-50 hover:text-gray-50 disabled:opacity-50"
          disabled={!message.trim()}
          onClick={submit}
        >
          <Send size={20} />
        </button>
      </div>

      {(isRecording || error) && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isPaused ? "bg-yellow-500" : "bg-red-500"
              } ${!isPaused ? "animate-pulse" : ""}`}
            />
            <span className="text-sm text-zinc-2 00">
              {isPaused ? "Paused" : "Recording"}
            </span>
            {isRecording && (
              <span className="text-sm tabular-nums text-zinc-400">
                {fmt(elapsed)}
              </span>
            )}
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>

          {isRecording && (
            <div className="mx-4 h-2 flex-1 rounded bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-zinc-300 transition-[width]"
                style={{ width: `${level}%` }}
              />
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-2">
              <button
                onClick={isPaused ? resume : pause}
                className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={stop}
                className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
