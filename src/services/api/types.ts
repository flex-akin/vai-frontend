export type ApiError = {
  message: string;
  status: number;
  data: any | null;
};

export type VideoSummary = {
  id: string | number;
  title: string;
  poster?: string;
  year?: number;
};

export type VideoDetail = VideoSummary & {
  description?: string;
  src?: string;
  duration?: number;
  uploadedAt?: string;
};

export type UploadVideoResponse = {
  id: string | number;
  title: string;
  description: string;
  fileUrl: string;
  duration: number;
  uploadedAt: string;
};

export type UserVideo = {
  id: number;
  title: string;
  description: string;
  duration_seconds: number;
  user_id: number;
  video_url: string;
  created_at: string;
};
