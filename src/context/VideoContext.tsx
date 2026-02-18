import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface VideoContextType {
  videoId: string | null;
  title: string | null;
  description: string | null;
  fileUrl: string | null;
  duration: number | null;
  uploadedAt: string | null;
  setVideoData: (data: {
    videoId: string;
    title: string;
    description: string;
    fileUrl: string;
    duration: number;
    uploadedAt: string;
  }) => void;
  clearVideoData: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);

  const setVideoData = (data: {
    videoId: string;
    title: string;
    description: string;
    fileUrl: string;
    duration: number;
    uploadedAt: string;
  }) => {
    setVideoId(data.videoId);
    setTitle(data.title);
    setDescription(data.description);
    setFileUrl(data.fileUrl);
    setDuration(data.duration);
    setUploadedAt(data.uploadedAt);
  };

  const clearVideoData = () => {
    setVideoId(null);
    setTitle(null);
    setDescription(null);
    setFileUrl(null);
    setDuration(null);
    setUploadedAt(null);
  };

  return (
    <VideoContext.Provider
      value={{
        videoId,
        title,
        description,
        fileUrl,
        duration,
        uploadedAt,
        setVideoData,
        clearVideoData,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error("useVideo must be used within a VideoProvider");
  }
  return context;
}
