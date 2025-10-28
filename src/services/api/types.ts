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
};
