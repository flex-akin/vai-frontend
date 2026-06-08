import axiosClient from "../http/axiosClient";

export const EVENT_TYPES = [
  "voice_input_submitted",
  "video_generation_started",
  "video_generation_completed",
  "video_playback_started",
  "video_looped",
  "video_replayed",
  "video_stopped",
  "user_exited",
  "error_generation_failed",
  "user_dropped_off",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type EventLog = {
  id: number;
  event_type: EventType;
  timestamp: string;
  user_id: number | null;
  session_id: string | null;
  video_id: number | null;
  input_type: string | null;
  metadata: Record<string, unknown> | null;
};

export type EventsResponse = {
  items: EventLog[];
  total: number;
  limit: number;
  offset: number;
};

export type EventsParams = {
  limit?: number;
  offset?: number;
  event_type?: EventType | "";
  user_id?: number | null;
  video_id?: number | null;
};

export const getEvents = async (params: EventsParams = {}): Promise<EventsResponse> => {
  const query: Record<string, string | number> = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  };
  if (params.event_type) query.event_type = params.event_type;
  if (params.user_id != null) query.user_id = params.user_id;
  if (params.video_id != null) query.video_id = params.video_id;

  const res = await axiosClient.get<EventsResponse>("/api/v1/events", { params: query });
  return res.data;
};
