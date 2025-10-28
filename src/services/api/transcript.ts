import axiosClient from "../http/axiosClient";

export type GetTranscriptOptions = {
  model?: string;
  language?: string;
  min_words_for_sentiment?: number;
  /**
   * Optional full base URL (e.g. http://localhost:8001). If provided, it will be used instead of the axios client's baseURL.
   */
  baseURL?: string;
};

export type TranscriptResponse = any; // replace with a proper shape if your API returns a known structure

/**
 * Uploads an audio file to the /transcribe endpoint and returns the parsed response.
 *
 * Mirrors the curl example:
 * curl -X 'POST' 'http://localhost:8001/transcribe' -H 'accept: application/json' \
 *  -H 'Content-Type: multipart/form-data' \
 *  -F 'file=@samplevid.mp3;type=audio/mpeg' -F 'model=whisper-1' -F 'language=en' -F 'min_words_for_sentiment=4'
 */
export const getTranscript = async (
  file: File,
  opts: GetTranscriptOptions = {}
): Promise<TranscriptResponse> => {
  const form = new FormData();
  form.append("file", file, file.name || "audio");
  if (opts.model) form.append("model", opts.model);
  if (opts.language) form.append("language", opts.language);
  if (typeof opts.min_words_for_sentiment !== "undefined")
    form.append("min_words_for_sentiment", "4");

  const url = opts.baseURL
    ? `${opts.baseURL.replace(/\/$/, "")}/transcribe`
    : `/transcribe`;

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
