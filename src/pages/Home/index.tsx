import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoUploadForm, { type VideoFormData } from "../../components/ui/VideoUploadForm";
import { getUserVideos, uploadVideo, getDefaultVideos } from "../../services/api/video";
import { useVideo } from "../../context/VideoContext";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/nav/navbar";
import type { UserVideo } from "../../services/api/types";

const GUIDELINES = [
  { icon: "🤖", text: "Use AI-generated or animated videos whenever possible", tag: "Recommended" },
  { icon: "👤", text: "Use fictional adult characters only" },
  { icon: "🚫", text: "Do not include children or minors" },
  { icon: "🚫", text: "Do not include celebrities or people that resemble public figures" },
  { icon: "⚠️", text: "Avoid realistic people that may look like real individuals" },
  { icon: "⏱️", text: "Keep videos short and simple — recommended length: 5–10 seconds" },
  { icon: "❌", text: "Avoid long or complex video requests" },
  { icon: "🎬", text: "Use the default test videos below to explore the app before uploading your own", tag: "Try it" },
];

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recentVideos, setRecentVideos] = useState<UserVideo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [defaultVideos, setDefaultVideos] = useState<UserVideo[]>([]);
  const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);
  const [guidelinesDismissed, setGuidelinesDismissed] = useState(
    () => localStorage.getItem("guidelines-dismissed") === "true"
  );
  const navigate = useNavigate();
  const { setVideoData } = useVideo();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const loadDefaults = async () => {
      setIsFetchingDefaults(true);
      try {
        const data = await getDefaultVideos();
        setDefaultVideos(data);
      } catch {
        // silently ignore — default videos are optional
      } finally {
        setIsFetchingDefaults(false);
      }
    };
    loadDefaults();
  }, []);

  useEffect(() => {
    const loadVideos = async () => {
      if (!user?.id) return;
      setIsFetching(true);
      setFetchError(null);
      try {
        const data = await getUserVideos(user.id);
        setRecentVideos(data);
      } catch (err: any) {
        setFetchError(err?.message || "Failed to load videos");
      } finally {
        setIsFetching(false);
      }
    };

    loadVideos();
  }, [user?.id]);

  const recentVideoCards = useMemo(
    () =>
      recentVideos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration_seconds,
        videoUrl: video.video_url,
        createdAt: video.created_at,
      })),
    [recentVideos]
  );

  const handleVideoSubmit = async (data: VideoFormData) => {
    setIsLoading(true);
    try {
      // Step 1: Upload video
      const userId = user?.id;
      if (!userId) {
        throw new Error("Unable to determine user. Please sign in again.");
      }

      const uploadResponse = await uploadVideo(
        data.file,
        data.title,
        data.description,
        data.videoDuration,
        userId
      );

      setRecentVideos((prev) => [
        {
          id: Number(uploadResponse.id),
          title: uploadResponse.title,
          description: uploadResponse.description,
          duration_seconds: uploadResponse.duration,
          user_id: userId,
          video_url: uploadResponse.fileUrl,
          created_at: uploadResponse.uploadedAt,
        },
        ...prev,
      ]);

      setShowUpload(false);

      // Step 2: Store video data in context
      setVideoData({
        videoId: String(uploadResponse.id),
        title: uploadResponse.title,
        description: uploadResponse.description,
        fileUrl: uploadResponse.fileUrl,
        duration: uploadResponse.duration,
        uploadedAt: uploadResponse.uploadedAt,
      });

      toast.success("Video uploaded successfully!");

      // Step 3: Navigate to watch page
      // Transcript will be generated on the watch page when user clicks Generate
      navigate(`/watch/${uploadResponse.id}`);
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error?.message || "Failed to upload video");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        onSearch={(q) => console.log("search:", q)}
        onSignIn={() => navigate("/login")}
        onSignOut={() => {
          signOut();
          navigate("/login");
        }}
        user={user}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Your videos</h1>
            <p className="text-sm text-white/60">
              Manage uploads and jump back into recent work.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            Add new
          </button>
        </div>

        {!guidelinesDismissed && (
          <div className="mt-8 relative rounded-2xl border border-amber-400/30 bg-amber-400/5 overflow-hidden">
            {/* top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              {/* header row */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">⚠️</span>
                  <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300 sm:tracking-[0.35em]">
                    Usage Guidelines
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setGuidelinesDismissed(true);
                    localStorage.setItem("guidelines-dismissed", "true");
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-amber-400/60 transition hover:bg-amber-400/10 hover:text-amber-300"
                  aria-label="Dismiss guidelines"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </button>
              </div>

              {/* guidelines grid */}
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {GUIDELINES.map((g, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-amber-400/10 bg-amber-400/5 px-3.5 py-3">
                    <span className="mt-px text-base leading-none shrink-0">{g.icon}</span>
                    <span className="text-sm leading-snug text-amber-100/80">
                      {g.text}
                      {g.tag && (
                        <span className="ml-2 inline-block rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          {g.tag}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent videos</h2>
            {isFetching && <span className="text-sm text-white/50">Loading…</span>}
          </div>

          {fetchError && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {fetchError}
            </div>
          )}

          {!isFetching && recentVideoCards.length === 0 && !fetchError && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No videos yet.
            </div>
          )}

          {recentVideoCards.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentVideoCards.map((video) => (
                <div
                  key={video.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="h-36 overflow-hidden rounded-xl bg-black/40 sm:h-40">
                    <video
                      src={video.videoUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        (e.target as HTMLVideoElement).currentTime = 0.1;
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-base font-semibold line-clamp-1">
                      {video.title}
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">
                      {video.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>
                        {new Date(video.createdAt).toLocaleDateString()}
                      </span>
                      <span>{Math.round(video.duration)}s</span>
                    </div>
                    <button
                      onClick={() => {
                        setVideoData({
                          videoId: String(video.id),
                          title: video.title,
                          description: video.description,
                          fileUrl: video.videoUrl,
                          duration: video.duration,
                          uploadedAt: video.createdAt,
                        });
                        navigate(`/watch/${video.id}`);
                      }}
                      className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Default Videos */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-semibold">Default videos</h2>
              <p className="text-sm text-white/50">
                Ready-made clips to explore the app — no upload needed.
              </p>
            </div>
            {isFetchingDefaults && (
              <span className="text-sm text-white/50">Loading…</span>
            )}
          </div>

          {!isFetchingDefaults && defaultVideos.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No default videos available.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {defaultVideos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="h-36 overflow-hidden rounded-xl bg-black/40 sm:h-40">
                    <video
                      src={video.video_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        (e.target as HTMLVideoElement).currentTime = 0.1;
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                        Default
                      </span>
                    </div>
                    <div className="text-base font-semibold line-clamp-1">
                      {video.title}
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">
                      {video.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{new Date(video.created_at).toLocaleDateString()}</span>
                      <span>{Math.round(video.duration_seconds)}s</span>
                    </div>
                    <button
                      onClick={() => {
                        setVideoData({
                          videoId: String(video.id),
                          title: video.title,
                          description: video.description,
                          fileUrl: video.video_url,
                          duration: video.duration_seconds,
                          uploadedAt: video.created_at,
                        });
                        navigate(`/watch/${video.id}`);
                      }}
                      className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-3xl">
            <button
              onClick={() => setShowUpload(false)}
              className="absolute -top-12 right-0 rounded-lg border border-white/10 bg-black/70 px-3 py-1 text-sm text-white/70 hover:text-white"
            >
              Close
            </button>
            <VideoUploadForm onSubmit={handleVideoSubmit} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
