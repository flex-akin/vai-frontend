import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoUploadForm, { type VideoFormData } from "../../components/ui/VideoUploadForm";
import { getUserVideos, uploadVideo } from "../../services/api/video";
import { useVideo } from "../../context/VideoContext";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/nav/navbar";
import type { UserVideo } from "../../services/api/types";

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recentVideos, setRecentVideos] = useState<UserVideo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();
  const { setVideoData } = useVideo();
  const { user, signOut } = useAuth();

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
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Your videos</h1>
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
                  <div className="h-40 overflow-hidden rounded-xl bg-black/40">
                    <video
                      src={video.videoUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
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
