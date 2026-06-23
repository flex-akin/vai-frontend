// components/ui/VoiceControlBar.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Mic, PauseCircle, PlayCircle } from "lucide-react";
import Player from "../../components/ui/VideoPlayer";
import TranscriptList from "../../components/ui/TranscriptList";
import MovieGrid from "../../components/ui/MovieGrid";
import type { TranscriptResponse } from "../../services/api/transcript";
import { callVideoPipeline } from "../../services/api/pipeline";
import type { PipelineResponse } from "../../services/api/pipeline";
import axiosClient from "../../services/http/axiosClient";
import Loader from "../../components/ui/Loader";
import { useVideo } from "../../context/VideoContext";
import { getUserVideos, getVideoById } from "../../services/api/video";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import type { UserVideo } from "../../services/api/types";
import { trackEvent } from "../../services/api/events";
import { prefetchClientContext } from "../../services/utils/locationDevice";

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
  opts: { maxSeconds?: number; onEvent?: (e: VoiceEvent) => void } = {},
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
    [],
  );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMime();
      const rec = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
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

// Component to show pipeline processing with time tracking
function PipelineProcessingUI({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  const ESTIMATED_TIME = 120; // ~2 minutes

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const now = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(now);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  const remaining = Math.max(0, ESTIMATED_TIME - elapsed);
  const progress = Math.min(100, (elapsed / ESTIMATED_TIME) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Loader size={16} />
        <span className="text-sm font-medium">Analyzing your voice…</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Elapsed: {fmt(elapsed)}</span>
          <span>Est. remaining: {fmt(remaining)}</span>
        </div>
        <div className="w-full bg-zinc-700/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-zinc-500 text-center mt-3">
        <p>Advanced analysis in progress:</p>
        <p className="text-zinc-600 mt-1">
          • Transcription • Sentiment • Intent • Video Generation
        </p>
      </div>
    </div>
  );
}

// Component to display pipeline results
function PipelineResultsUI({ result }: { result: PipelineResponse }) {
  const [activeTab, setActiveTab] = useState<
    "viewer" | "analysis" | "generated"
  >("viewer");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-700">
        <button
          onClick={() => setActiveTab("viewer")}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "viewer"
              ? "border-b-2 border-blue-500 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Your Reaction
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "analysis"
              ? "border-b-2 border-blue-500 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab("generated")}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "generated"
              ? "border-b-2 border-blue-500 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Generated
        </button>
      </div>

      {/* Viewer Transcript */}
      {activeTab === "viewer" && (
        <div className="bg-black/30 rounded-lg p-3 space-y-3 max-h-64 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-zinc-300 mb-2">Your Text:</p>
            <p className="text-sm text-white">
              {result.viewer_transcript.text}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-zinc-300">Sentiment:</p>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  result.viewer_transcript.overall_sentiment.signed_avg > 0
                    ? "bg-green-500/20 text-green-300"
                    : result.viewer_transcript.overall_sentiment.signed_avg < 0
                      ? "bg-red-500/20 text-red-300"
                      : "bg-zinc-700/30 text-zinc-300"
                }`}
              >
                {result.intent_analysis.viewer_sentiment.label} (
                {(result.intent_analysis.viewer_sentiment.score * 100).toFixed(
                  0,
                )}
                %)
              </span>
            </div>
          </div>

          {result.viewer_transcript.segments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-2">
                Breakdown:
              </p>
              <div className="space-y-1 text-xs text-zinc-400">
                {result.viewer_transcript.segments.map((seg) => (
                  <div key={seg.idx} className="flex justify-between">
                    <span>{seg.text}</span>
                    <span className="text-zinc-500">
                      ({seg.sentiment.label})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis */}
      {activeTab === "analysis" && (
        <div className="bg-black/30 rounded-lg p-3 space-y-3 max-h-64 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-zinc-300 mb-1">
              Detected Intent:
            </p>
            <p className="text-sm text-white">
              {result.intent_analysis.decision.explain}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-300 mb-1">
              Recommended Action:
            </p>
            <p className="text-sm text-blue-300 font-medium">
              {result.intent_analysis.decision.action}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-300 mb-1">
              Video Sentiment:
            </p>
            <span
              className={`inline-block text-xs px-2 py-1 rounded ${
                result.intent_analysis.video_sentiment.score > 0.6
                  ? "bg-green-500/20 text-green-300"
                  : "bg-zinc-700/30 text-zinc-300"
              }`}
            >
              {result.intent_analysis.video_sentiment.label} (
              {(result.intent_analysis.video_sentiment.score * 100).toFixed(0)}
              %)
            </span>
          </div>

          {result.veo3_prompt && (
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-1">
                Generated Vision:
              </p>
              <p className="text-xs text-zinc-300 line-clamp-4 italic">
                {result.veo3_prompt}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generated Video */}
      {activeTab === "generated" && (
        <div className="bg-black/30 rounded-lg p-3 space-y-3">
          {result.extracted_image_path && (
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-2">
                Scene Frame:
              </p>
              <img
                src={result.extracted_image_path}
                alt="Extracted frame"
                className="w-full rounded-lg h-auto max-h-40 object-cover"
              />
            </div>
          )}

          {result.generated_video_path && (
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-2">
                Generated Video:
              </p>
              <div className="text-xs text-zinc-400">
                <a
                  href={result.generated_video_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {result.generated_video_path}
                </a>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Size: {result.file_size_mb.toFixed(2)} MB | Processed in{" "}
                {result.processing_time_seconds.toFixed(1)}s
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Modal component for generated video playback
function GeneratedVideoModal({
  videoPath,
  onClose,
}: {
  videoPath: string | null;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoPath || !videoRef.current) return;

    const handleVideoEnd = () => {
      console.log("Generated video ended in modal, closing");
      onClose();
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    videoRef.current.addEventListener("ended", handleVideoEnd);
    window.addEventListener("keydown", handleEscKey);
    void videoRef.current.play().catch(() => {});

    return () => {
      videoRef.current?.removeEventListener("ended", handleVideoEnd);
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [videoPath, onClose]);

  if (!videoPath) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-auto px-4">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/60 hover:text-white text-sm font-medium"
          aria-label="Close"
        >
          Press ESC or click here to close
        </button>

        <div
          className="relative bg-black rounded-xl overflow-hidden"
          style={{ aspectRatio: "16/9" }}
        >
          <video
            ref={videoRef}
            src={videoPath}
            controls
            className="w-full h-full"
            autoPlay
          />
        </div>

        <div className="text-center mt-4 text-sm text-zinc-400">
          Video will automatically close when finished playing
        </div>
      </div>
    </div>
  );
}

export default function Watch(props: {
  onVoiceEvent?: (e: VoiceEvent) => void;
}) {
  const { onVoiceEvent } = props;
  const videoContext = useVideo();
  const { setVideoData } = videoContext;
  const { user } = useAuth();
  const { videoId: routeVideoId } = useParams();
  const navigate = useNavigate();
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<UserVideo[]>([]);
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
      "video",
    ) as HTMLVideoElement | null;
    if (!videoEl) return;

    // dummyUrl removed: we now show a loader overlay on the real video instead of swapping sources

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
        originalSrcRef.current = videoEl.currentSrc || videoEl.src || null;
      } catch {
        originalSrcRef.current = null;
      }

      // Log the voice input event immediately on recording stop.
      void trackEvent({
        event_type: "voice_input_submitted",
        user_id: user?.id ?? null,
        video_id: routeVideoId ? Number(routeVideoId) : null,
        input_type: "voice",
        metadata: { duration_sec: e.durationSec, file_size_bytes: e.blob.size },
      });

      // asynchronously send the recorded audio to the pipeline
      // This does transcription + sentiment analysis + intent detection + video generation
      (async () => {
        try {
          setRecordedFile(e.file);
          setPipelineError(null);
          setIsPipelineProcessing(true);
          setProcessingStartTime(Date.now());

          if (!routeVideoId) {
            throw new Error("Video ID not found");
          }

          console.log(
            "Calling pipeline with recorded audio and video ID:",
            routeVideoId,
          );
          const pipelineRes = await callVideoPipeline(routeVideoId, e.file);
          console.log("Pipeline response:", pipelineRes);

          setPipelineResult(pipelineRes);
          setRecordedTranscript(pipelineRes.viewer_transcript ?? null);
          toast.success("Voice analysis complete!");
        } catch (err: any) {
          console.error("Pipeline processing failed", err);
          const msg = err?.message || String(err);
          setPipelineError(msg);
          toast.error(`Voice analysis failed: ${msg}`);
        } finally {
          setIsPipelineProcessing(false);
          setProcessingStartTime(null);
          setVideoLoaderVisible(false);
          if (loaderTimeoutRef.current) {
            window.clearTimeout(loaderTimeoutRef.current);
            loaderTimeoutRef.current = null;
          }
        }
      })();

      // (previous dummy-ended restore logic removed) we now keep the original video and show a loader overlay

      try {
        // Show a loader overlay on top of the current video and pause playback
        try {
          videoEl.pause();
        } catch {}

        setVideoLoaderVisible(true);

        // fallback: hide loader after 10 minutes if nothing clears it
        try {
          if (loaderTimeoutRef.current)
            window.clearTimeout(loaderTimeoutRef.current);
        } catch {}
        loaderTimeoutRef.current = window.setTimeout(
          () => {
            // hide loader and fast-forward a bit
            try {
              const v = playerWrapRef.current?.querySelector(
                "video",
              ) as HTMLVideoElement | null;
              if (v) {
                const newT = Math.min(
                  v.duration || 0,
                  (v.currentTime || 0) + 3,
                );
                try {
                  v.currentTime = newT;
                } catch {}
                if (wasPlayingRef.current) {
                  void v.play().catch(() => {});
                }
              }
            } catch {}
            setVideoLoaderVisible(false);
          },
          10 * 60 * 1000,
        );
      } catch {
        // if anything goes wrong, ensure we clear loader state
        setVideoLoaderVisible(false);
        savedTimeRef.current = null;
        wasPlayingRef.current = null;
        originalSrcRef.current = null;
      }
    }
  };

  const { isRecording, isPaused, elapsed, level, start, stop, pause, resume } =
    useVoiceRecorder({ onEvent: handleVoiceEvent });

  const [apiTranscript, setApiTranscript] = useState<TranscriptResponse | null>(
    null,
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedTranscript, setRecordedTranscript] =
    useState<TranscriptResponse | null>(null);
  const [videoLoaderVisible, setVideoLoaderVisible] = useState(false);
  const [isPipelineProcessing, setIsPipelineProcessing] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResponse | null>(
    null,
  );
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const generatedVideoPlaybackMode =
    (searchParams.get("mode") as "inline" | "modal" | null) ?? "inline";
  const setGeneratedVideoPlaybackMode = (mode: "inline" | "modal") =>
    setSearchParams((prev) => { prev.set("mode", mode); return prev; }, { replace: true });
  const [showGeneratedVideoModal, setShowGeneratedVideoModal] = useState(false);
  const loaderTimeoutRef = useRef<number | null>(null);

  // Always-current context for use inside event-listener closures (avoids stale captures).
  const suppressPlaybackTrackingRef = useRef(false);
  const videoEndedRef = useRef(false);
  const eventContextRef = useRef<{ userId: number | null; videoId: number | null }>({
    userId: null,
    videoId: null,
  });

  // Keep eventContextRef in sync whenever user or videoId changes.
  useEffect(() => {
    eventContextRef.current = {
      userId: user?.id ?? null,
      videoId: routeVideoId ? Number(routeVideoId) : null,
    };
  }, [user?.id, routeVideoId]);

  // Trigger geolocation permission prompt as early as possible.
  useEffect(() => {
    prefetchClientContext();
  }, []);

  // Attach video playback event listeners.
  // Uses a 400ms polling interval so we survive ReactPlayer recreating the <video>
  // element on src changes, and we never have stale closed-over state values.
  useEffect(() => {
    let currentVideo: HTMLVideoElement | null = null;
    let detachListeners: (() => void) | null = null;

    const attach = (v: HTMLVideoElement) => {
      if (detachListeners) detachListeners();
      currentVideo = v;

      const onPlay = () => {
        if (suppressPlaybackTrackingRef.current) return;
        const { userId, videoId } = eventContextRef.current;
        const eventType = videoEndedRef.current ? "video_replayed" : "video_playback_started";
        videoEndedRef.current = false;
        void trackEvent({ event_type: eventType, user_id: userId, video_id: videoId });
      };

      const onPause = () => {
        if (suppressPlaybackTrackingRef.current) return;
        if (v.ended) return;
        const { userId, videoId } = eventContextRef.current;
        void trackEvent({
          event_type: "video_stopped",
          user_id: userId,
          video_id: videoId,
          metadata: { current_time_ms: Math.round(v.currentTime * 1000) },
        });
      };

      const onEnded = () => {
        if (suppressPlaybackTrackingRef.current) return;
        videoEndedRef.current = true;
        const { userId, videoId } = eventContextRef.current;
        void trackEvent({
          event_type: "video_stopped",
          user_id: userId,
          video_id: videoId,
          metadata: { reason: "ended" },
        });
      };

      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("ended", onEnded);

      detachListeners = () => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("ended", onEnded);
      };
    };

    // Poll every 400ms — handles lazy element creation and element replacement.
    const intervalId = window.setInterval(() => {
      const v = playerWrapRef.current?.querySelector("video") as HTMLVideoElement | null;
      if (v && v !== currentVideo) {
        attach(v);
      }
    }, 400);

    return () => {
      clearInterval(intervalId);
      detachListeners?.();
    };
  }, []);

  // Track user_exited when navigating away (SPA) or closing the tab.
  useEffect(() => {
    const onBeforeUnload = () => {
      const { userId, videoId } = eventContextRef.current;
      const body = JSON.stringify({ event_type: "user_exited", user_id: userId, video_id: videoId });
      // sendBeacon survives page unload; plain fetch would be cancelled.
      navigator.sendBeacon("/api/v1/events", new Blob([body], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Also fire on SPA navigation (component unmount without page reload).
      const { userId, videoId } = eventContextRef.current;
      void trackEvent({ event_type: "user_exited", user_id: userId, video_id: videoId });
    };
  }, []);

  useEffect(() => {
    const loadRelated = async () => {
      if (!user?.id) return;
      try {
        const data = await getUserVideos(user.id);
        setRelatedVideos(data);
      } catch {
        setRelatedVideos([]);
      }
    };

    loadRelated();
  }, [user?.id]);

  useEffect(() => {
    const loadVideo = async () => {
      if (!routeVideoId) return;
      if (String(videoContext.videoId) === String(routeVideoId)) return;

      setIsLoadingVideo(true);
      setVideoError(null);
      try {
        const data = await getVideoById(routeVideoId);
        setVideoData({
          videoId: String(data.id),
          title: data.title,
          description: data.description,
          fileUrl: data.video_url,
          duration: data.duration_seconds,
          uploadedAt: data.created_at,
        });
      } catch (err: any) {
        setVideoError(err?.message || "Failed to load video");
      } finally {
        setIsLoadingVideo(false);
      }
    };

    loadVideo();
  }, [routeVideoId, videoContext.videoId, setVideoData]);

  // when the recorded transcript arrives, hide the loader, fast-forward the video a bit and resume if needed
  useEffect(() => {
    if (!recordedTranscript) return;

    try {
      if (loaderTimeoutRef.current) {
        window.clearTimeout(loaderTimeoutRef.current);
        loaderTimeoutRef.current = null;
      }
    } catch {}

    const v = playerWrapRef.current?.querySelector(
      "video",
    ) as HTMLVideoElement | null;
    if (v) {
      try {
        // const newT = Math.min((v.duration || 0), (v.currentTime || 0) + 3);
        const newT = Math.max(0, (v.currentTime || 0) - 3);
        v.currentTime = newT;
      } catch {}
      try {
        if (wasPlayingRef.current) {
          void v.play().catch(() => {});
        }
      } catch {}
    }
    setVideoLoaderVisible(false);
  }, [recordedTranscript]);

  // when the pipeline result arrives, play the generated video
  useEffect(() => {
    if (!pipelineResult?.generated_video_path) return;

    const generatedPath = pipelineResult.generated_video_path;

    if (generatedVideoPlaybackMode === "modal") {
      // ================= MODAL MODE =================
      suppressPlaybackTrackingRef.current = true;
      saveMainVideoState();

      const v = getMainVideo();
      if (v) {
        v.pause();
      }

      setShowGeneratedVideoModal(true);
      return;
    }

    // ================= INLINE MODE =================

    const v = getMainVideo();
    if (!v) return;

    saveMainVideoState();

    const handleGeneratedEnd = () => {
      // Restore original video and resume playing
      if (!v || !originalSrcRef.current) return;

      try {
        v.pause();
        v.src = originalSrcRef.current;
        v.load();

        if (savedTimeRef.current != null) {
          v.currentTime = savedTimeRef.current;
        }

        // Wait for video to be ready before playing
        const handleCanPlay = () => {
          // Re-enable tracking before resuming the original video.
          suppressPlaybackTrackingRef.current = false;
          if (wasPlayingRef.current) {
            v.play().catch((err) => {
              console.error("Error resuming video:", err);
            });
          }
          v.removeEventListener("canplay", handleCanPlay);
        };

        v.addEventListener("canplay", handleCanPlay);

        // Fallback in case canplay doesn't fire
        setTimeout(() => {
          suppressPlaybackTrackingRef.current = false;
          if (wasPlayingRef.current && v.paused) {
            v.play().catch(() => {});
          }
        }, 300);
      } catch (err) {
        suppressPlaybackTrackingRef.current = false;
        console.error("Error restoring video:", err);
      }

      v.removeEventListener("ended", handleGeneratedEnd);
    };

    // Suppress tracking during generated video playback (source swap is not a user action).
    suppressPlaybackTrackingRef.current = true;
    try {
      v.pause();
      v.src = generatedPath;
      v.load();

      v.addEventListener("ended", handleGeneratedEnd);

      v.play().catch(() => {});
    } catch (err) {
      console.error("Error playing generated video inline:", err);
    }

    return () => {
      v.removeEventListener("ended", handleGeneratedEnd);
    };
  }, [pipelineResult?.generated_video_path, generatedVideoPlaybackMode]);

  // cleanup loader timeout on unmount
  useEffect(() => {
    return () => {
      try {
        if (loaderTimeoutRef.current)
          window.clearTimeout(loaderTimeoutRef.current);
      } catch {}
    };
  }, []);

  // Pause main video when modal is showing or user is recording
  // Pause main video only when modal is showing
  // Keep video playing while recording
  useEffect(() => {
    const v = playerWrapRef.current?.querySelector(
      "video",
    ) as HTMLVideoElement | null;
    if (!v) return;

    if (showGeneratedVideoModal) {
      v.pause();
    } else if (!showGeneratedVideoModal && wasPlayingRef.current) {
      // Resume when modal closes if video was playing before
      v.play().catch(() => {});
    }
  }, [showGeneratedVideoModal]);

  // helper to transcribe the uploaded video via backend endpoint
  const transcribeUploadedVideo = async () => {
    // Prevent multiple concurrent requests
    if (isTranscribing) {
      console.warn("Transcription already in progress");
      return;
    }

    // ================= VIDEO CONTROL HELPERS =================

    console.log("Setting isTranscribing to true");
    setIsTranscribing(true);
    const loadingToastId = toast.loading("Transcribing video...");

    try {
      if (!routeVideoId) {
        toast.error("Video ID not found");
        throw new Error("Video ID not found");
      }

      console.log("Starting transcription for video:", routeVideoId);

      // Call backend endpoint that handles video download, audio conversion, and transcription
      const res = await axiosClient.get(
        `/api/v1/videos/${routeVideoId}/transcribe`,
      );

      console.log("Transcribe response received:", res.data);
      setApiTranscript(res.data ?? null);
      console.log("apiTranscript state updated");

      // Dismiss the loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success("Transcription complete!");
      return res.data;
    } catch (err: any) {
      console.error("transcribe video error:", err);
      const msg = err?.message || String(err);
      // Dismiss the loading toast and show error
      toast.dismiss(loadingToastId);
      toast.error(`Transcription failed: ${msg}`);
    } finally {
      console.log("Finally block: setting isTranscribing to false");
      setIsTranscribing(false);
    }
  };

  const getMainVideo = () =>
    playerWrapRef.current?.querySelector("video") as HTMLVideoElement | null;

  const saveMainVideoState = () => {
    const v = getMainVideo();
    if (!v) return;

    savedTimeRef.current = v.currentTime;
    wasPlayingRef.current = !v.paused && !v.ended;
    originalSrcRef.current = v.currentSrc || v.src || null;
  };

  const restoreMainVideoSrc = () => {
    const v = getMainVideo();
    if (!v || !originalSrcRef.current) return;

    try {
      v.pause();
      v.src = originalSrcRef.current;
      v.load();
      
      if (savedTimeRef.current != null) {
        v.currentTime = savedTimeRef.current;
      }

      // Play immediately if it was playing before
      if (wasPlayingRef.current) {
        v.play().catch((err) => {
          console.error("Error playing video:", err);
        });
      }
    } catch (err) {
      console.error("Error restoring main video:", err);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {(isLoadingVideo || videoError) && (
          <div className="px-4 pt-4">
            {isLoadingVideo && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Loading video details…
              </div>
            )}
            {videoError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {videoError}
              </div>
            )}
          </div>
        )}
        {/* Main container */}
        <div className="max-w-7xl mx-auto">
          {/* Video Player Section - Full Width */}
          <div className="w-full bg-black pt-3 px-3 sm:pt-4 sm:px-4">
            <div
              ref={playerWrapRef}
              className="relative w-full rounded-xl overflow-hidden bg-black"
              style={{ aspectRatio: "16/9" }}
            >
              <Player src={videoContext.fileUrl || "src/data/samplevid.mp4"} />
              {videoLoaderVisible && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-4 rounded-full bg-black/70">
                      <Loader />
                    </div>
                    <div className="text-sm text-white/80">
                      Processing recording…
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title and Description Section */}
          <div className="px-3 py-4 border-b border-zinc-800 sm:px-4 sm:py-6">
            {videoContext.title ? (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h1 className="text-xl font-bold leading-tight mb-1 sm:text-2xl md:text-4xl sm:mb-2">
                    {videoContext.title}
                  </h1>
                  <p className="text-zinc-300 text-sm leading-relaxed md:text-lg">
                    {videoContext.description}
                  </p>
                </div>

                {/* Video Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1 sm:gap-6 sm:text-sm sm:pt-3">
                  {videoContext.duration && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Duration:</span>
                      <span className="text-white font-medium">
                        {Math.floor(videoContext.duration / 60)}:
                        {String(
                          Math.floor(videoContext.duration % 60),
                        ).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  {videoContext.uploadedAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Uploaded:</span>
                      <span className="text-white font-medium">
                        {new Date(videoContext.uploadedAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h1 className="text-xl font-bold sm:text-2xl md:text-4xl">Video Player</h1>
                <p className="text-zinc-400 text-sm md:text-lg">
                  Upload a video from home page to see details
                </p>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 py-4 px-3 sm:gap-6 sm:py-8 sm:px-4">
            {/* Left Column - Transcript */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Transcript Section */}
                <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold sm:text-2xl">Transcript</h2>
                    <button
                      onClick={() =>
                        transcribeUploadedVideo().catch(
                          () => {},
                        )
                      }
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white px-4 py-2 flex items-center gap-2 text-sm font-medium"
                      disabled={isTranscribing}
                    >
                      {isTranscribing ? (
                        <>
                          <Loader size={4} />
                          Generating…
                        </>
                      ) : (
                        <>
                          <span>🎯</span>
                          Generate Transcript
                        </>
                      )}
                    </button>
                  </div>

                  {isTranscribing ? (
                    <div className="flex items-center justify-center py-6 gap-3">
                      <Loader size={4} />
                      <span className="text-sm text-zinc-300">
                        Transcribing your video…
                      </span>
                    </div>
                  ) : apiTranscript ? (
                    <div className="max-h-96 overflow-y-auto">
                      <TranscriptList transcript={apiTranscript} />
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-400">
                      <p>Click "Generate Transcript" to start transcribing</p>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div>
                  <h2 className="text-lg font-bold mb-3 sm:text-2xl sm:mb-4">Related Videos</h2>
                  {relatedVideos.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                      No other videos yet.
                    </div>
                  ) : (
                    <MovieGrid
                      movies={relatedVideos
                        .filter(
                          (v) => String(v.id) !== String(videoContext.videoId),
                        )
                        .map((v) => ({
                          id: v.id,
                          title: v.title,
                          year: new Date(v.created_at).getFullYear(),
                          videoUrl: v.video_url,
                        }))}
                      onPlay={(m) => {
                        if (m.id) {
                          navigate(`/watch/${m.id}`);
                        }
                      }}
                      className=""
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Recording */}
            <div className="space-y-6">
              {/* Recording Panel */}
              <div className="bg-zinc-900/40 rounded-xl p-6 border border-zinc-800 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Voice Recording</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400">
                      Generated Video:
                    </label>
                    <select
                      value={generatedVideoPlaybackMode}
                      onChange={(e) =>
                        setGeneratedVideoPlaybackMode(
                          e.target.value as "inline" | "modal",
                        )
                      }
                      className="text-xs bg-zinc-800 border border-zinc-700 text-white px-2 py-1 rounded hover:border-zinc-600 transition-colors"
                    >
                      <option value="modal">Modal</option>
                      <option value="inline">Inline</option>
                    </select>
                  </div>
                </div>

                {recordedFile ? (
                  <div className="space-y-4">
                    <div className="bg-black/50 rounded-lg p-4">
                      <audio
                        controls
                        src={URL.createObjectURL(recordedFile)}
                        className="w-full rounded accent-blue-600"
                      />
                    </div>

                    {isPipelineProcessing ? (
                      <PipelineProcessingUI startTime={processingStartTime} />
                    ) : pipelineResult ? (
                      <PipelineResultsUI result={pipelineResult} />
                    ) : pipelineError ? (
                      <div className="bg-red-900/20 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                        {pipelineError}
                      </div>
                    ) : recordedTranscript ? (
                      <div className="bg-black/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <p className="text-sm text-zinc-300 font-medium mb-2">
                          Transcript:
                        </p>
                        <div className="text-sm text-zinc-200 space-y-2">
                          {recordedTranscript.text && (
                            <p>{recordedTranscript.text}</p>
                          )}
                          {Array.isArray(recordedTranscript.segments) &&
                            recordedTranscript.segments.length > 0 && (
                              <div className="space-y-2 text-xs text-zinc-400">
                                {recordedTranscript.segments.map(
                                  (s: any, i: number) => (
                                    <p key={i}>{s.text}</p>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-zinc-500">
                        Processing…
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-zinc-400">
                    <p className="text-sm">No recordings yet</p>
                    <p className="text-xs mt-2">Use the mic button to record</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Control Bar - Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-3 rounded-2xl bg-black/80 backdrop-blur-md px-4 py-3 shadow-2xl border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
            <div className="w-32 text-center text-xs text-white/80 tabular-nums font-medium">
              {isRecording
                ? isPaused
                  ? `Paused ${fmt(elapsed)}`
                  : `Rec ${fmt(elapsed)}`
                : "Press to speak"}
            </div>

            <div className="h-2 w-40 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-[width] duration-100"
                style={{ width: `${level}%` }}
              />
            </div>

            {!isRecording ? (
              <button
                onClick={start}
                className="rounded-full bg-red-600 hover:bg-red-500 p-2 transition-colors shadow-lg"
                aria-label="Start recording"
                title="Start recording"
              >
                <Mic className="h-5 w-5 text-white" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={isPaused ? resume : pause}
                  className="rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors"
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
                  className="rounded-full bg-red-600 hover:bg-red-500 px-3 py-2 text-xs text-white font-medium transition-colors"
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

      {/* Generated Video Modal */}
      {showGeneratedVideoModal && (
        <GeneratedVideoModal
          videoPath={pipelineResult?.generated_video_path || null}
          onClose={() => {
            suppressPlaybackTrackingRef.current = false;
            setShowGeneratedVideoModal(false);
            restoreMainVideoSrc();
          }}
        />
      )}
    </>
  );
}
