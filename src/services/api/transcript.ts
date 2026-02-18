import axiosClient from "../http/axiosClient";

export type GetTranscriptOptions = {
  model?: string;
  language?: string;
  min_words_for_sentiment?: number;
 
  baseURL?: string;
};

export type TranscriptResponse = any; // replace with a proper shape if your API returns a known structure


export const getTranscript = async (
  file: File,
  opts: GetTranscriptOptions = {}
): Promise<TranscriptResponse> => {
  const form = new FormData();
  form.append("audio_file", file, file.name || "audio");
  if (opts.model) form.append("model", opts.model);
  if (opts.language) form.append("language", opts.language);
  if (typeof opts.min_words_for_sentiment !== "undefined")
    form.append("min_words_for_sentiment", "4");

  const url = opts.baseURL
    ? `${opts.baseURL.replace(/\/$/, "")}/api/v1/transcribe`
    : `/api/v1/transcribe`;

  // If a full baseURL is provided we still use axiosClient to keep interceptors, but pass absolute URL.
  // IMPORTANT: don't set Content-Type for FormData. Let the browser set the boundary.
  console.debug("transcribe: POST ->", url);
  // Debug: list FormData entries so we can confirm the file is present client-side.
  try {
    for (const entry of Array.from((form as any).entries())) {
      const [k, v] = entry as [string, any];
      if (v instanceof File) {
        console.debug(`form entry: ${k} -> File(name=${v.name}, type=${v.type}, size=${v.size})`);
      } else {
        console.debug(`form entry: ${k} ->`, v);
      }
    }
  } catch (e) {
    console.debug("could not enumerate FormData entries", e);
  }
  const res = await axiosClient.post(url, form);

  return res.data;
};
