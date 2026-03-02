import axiosClient from "../http/axiosClient";
import type {
  VideoSummary,
  VideoDetail,
  UploadVideoResponse,
  UserVideo,
} from "./types";

export const getVideos = async (): Promise<VideoSummary[]> => {
  const res = await axiosClient.get<VideoSummary[]>("/videos");
  return res.data;
};

export const getVideo = async (id: string | number): Promise<VideoDetail> => {
  const res = await axiosClient.get<VideoDetail>(`/api/v1/videos/${id}`);
  return res.data;
};

export const getUserVideos = async (userId: number): Promise<UserVideo[]> => {
  const res = await axiosClient.get<UserVideo[]>(`/api/v1/users/${userId}/videos`);
  return res.data;
};

export const getVideoById = async (id: string | number): Promise<UserVideo> => {
  const res = await axiosClient.get<UserVideo>(`/api/v1/videos/${id}`);
  return res.data;
};

export const getDefaultVideos = async (): Promise<UserVideo[]> => {
  const res = await axiosClient.get<UserVideo[]>("/api/v1/videos/default");
  return res.data;
};

export const uploadAudio = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await axiosClient.post("/audio/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const uploadVideo = async (
  file: File,
  title: string,
  description: string,
  durationSeconds: number,
  userId: number
): Promise<UploadVideoResponse> => {
  try {
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("duration_seconds", String(durationSeconds));
    form.append("user_id", String(userId));
    form.append("video_file", file);

    const res = await axiosClient.post<{
      id: number;
      title: string;
      description: string;
      duration_seconds: number;
      user_id: number;
      video_url: string;
      created_at: string;
    }>("/api/v1/videos", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return {
      id: res.data.id,
      title: res.data.title,
      description: res.data.description,
      fileUrl: res.data.video_url,
      duration: res.data.duration_seconds,
      uploadedAt: res.data.created_at,
    };
  } catch (err) {
    throw new Error("Failed to upload video");
  }
};
