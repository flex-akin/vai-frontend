import axiosClient from "../http/axiosClient";
import type { VideoSummary, VideoDetail } from "./types";

export const getVideos = async (): Promise<VideoSummary[]> => {
  const res = await axiosClient.get<VideoSummary[]>("/videos");
  return res.data;
};

export const getVideo = async (id: string | number): Promise<VideoDetail> => {
  const res = await axiosClient.get<VideoDetail>(`/videos/${id}`);
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
