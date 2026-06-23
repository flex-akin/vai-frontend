import axiosClient from "../http/axiosClient";
import { getClientContext, type LocationData, type DeviceInfo } from "../utils/locationDevice";

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
  location: LocationData | null;
  device_info: DeviceInfo | null;
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

export type TrackEventPayload = {
  event_type: EventType;
  user_id?: number | null;
  session_id?: string | null;
  video_id?: number | null;
  input_type?: string | null;
  metadata?: Record<string, unknown> | null;
  // Pass explicitly to override auto-collection, or omit to let trackEvent attach them.
  location?: LocationData | null;
  device_info?: DeviceInfo | null;
};

/**
 * Fire a client-side event to the backend.
 * Automatically attaches location + device_info from the cached client context
 * unless the caller passes them explicitly.
 * Never throws — failures are silently swallowed so event tracking never
 * interrupts user-facing flows.
 */
export const trackEvent = async (payload: TrackEventPayload): Promise<void> => {
  try {
    const ctx = await getClientContext();
    const body = {
      ...payload,
      location: payload.location !== undefined ? payload.location : ctx.location,
      device_info: payload.device_info !== undefined ? payload.device_info : ctx.device_info,
    };
    await axiosClient.post("/api/v1/events", body);
  } catch {
    // event tracking must never break the main UX
  }
};

// Re-export types from the utility so callers can import from one place.
export type { LocationData, DeviceInfo };
