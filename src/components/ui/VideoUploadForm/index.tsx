import { useState, useRef } from "react";
import { Upload, Loader as LoaderIcon } from "lucide-react";
import Loader from "../Loader";

export interface VideoFormData {
  file: File;
  title: string;
  description: string;
  videoDuration: number;
}

interface VideoUploadFormProps {
  onSubmit: (data: VideoFormData) => Promise<void>;
  isLoading?: boolean;
}

export default function VideoUploadForm({
  onSubmit,
  isLoading = false,
}: VideoUploadFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file is a video
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }

    setError(null);
    setVideoFile(file);

    // Get video duration
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      URL.revokeObjectURL(url);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile) {
      setError("Please select a video file");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    try {
      await onSubmit({
        file: videoFile,
        title: title.trim(),
        description: description.trim(),
        videoDuration,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to upload video");
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-[#181818] rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
        <p className="text-zinc-400 mb-8">
          Upload a video to analyze, get transcripts, and more.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Video File *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-600 hover:border-zinc-400 rounded-lg p-8 cursor-pointer transition text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
              />
              {videoFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-green-500" />
                  <p className="font-medium text-white">{videoFile.name}</p>
                  <p className="text-sm text-zinc-400">
                    {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {videoDuration > 0 && (
                    <p className="text-sm text-zinc-300">
                      Duration: {formatDuration(videoDuration)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-zinc-500" />
                  <p className="font-medium">Click or drag video here</p>
                  <p className="text-sm text-zinc-400">MP4, WebM, OGG, etc.</p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              placeholder="Enter video title"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              placeholder="Enter video description"
              rows={4}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !videoFile}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader /> Uploading and processing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload & Analyze
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
