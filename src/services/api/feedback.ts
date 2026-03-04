import axiosClient from "../http/axiosClient";

export type FeedbackEntry = {
  first_name: string;
  last_name: string;
  email: string;
  stars: number;
  comment: string | null;
  created_at: string;
};

export const submitFeedback = async (payload: {
  user_id: number;
  stars: number;
  comment?: string;
}): Promise<void> => {
  await axiosClient.post("/api/v1/feedback", payload);
};

export const getFeedback = async (): Promise<FeedbackEntry[]> => {
  const res = await axiosClient.get<FeedbackEntry[]>("/api/v1/feedback");
  return res.data;
};
