import type { GetTranscriptOptions } from "../api/transcript";
import { getTranscript } from "../api/transcript";

export type TranscribeFromVideoOptions = {
  /** ffmpeg output format: 'mp3' | 'wav' | 'm4a' | 'webm' */
  format?: "mp3" | "wav" | "m4a" | "webm";
  /** optional filename for the produced audio file */
  audioFilename?: string;
  /** transcript options forwarded to the /transcribe API */
  transcriptOptions?: Partial<GetTranscriptOptions>;
  /** optional progress callback during ffmpeg extraction; receives a message string */
  onProgress?: (msg: string) => void;
};

async function convertFileWithFFmpeg(file: File, format: "mp3" | "wav" | "m4a" | "webm") {
  const raw = (await import("@ffmpeg/ffmpeg")) as any;

  // Two possible runtime shapes:
  // 1) the createFFmpeg wrapper: exposes createFFmpeg() and fetchFile()
  // 2) the FFmpeg class: exposes FFmpeg class with methods writeFile/readFile/exec
  const createWrapper = raw?.createFFmpeg ?? raw?.default?.createFFmpeg ?? undefined;
  const fetchHelper = raw?.fetchFile ?? raw?.default?.fetchFile ?? undefined;

  const usingWrapper = typeof createWrapper === "function" && typeof fetchHelper === "function";

  // use deterministic names inside ffmpeg FS
  const inputName = "input_file";
  const outName = `out.${format}`;

  let args: string[] = [];
  switch (format) {
    case "mp3":
      args = ["-i", inputName, "-vn", "-acodec", "libmp3lame", "-q:a", "2", outName];
      break;
    case "m4a":
      args = ["-i", inputName, "-vn", "-c:a", "aac", "-b:a", "192k", outName];
      break;
    case "wav":
      args = ["-i", inputName, "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", outName];
      break;
    case "webm":
      args = ["-i", inputName, "-vn", "-c:a", "libopus", "-b:a", "96k", outName];
      break;
  }

  if (usingWrapper) {
    // old-style wrapper
    const ffmpeg = createWrapper({ log: false });
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    // write input via helper
    const inputData = await fetchHelper(file);
    ffmpeg.FS("writeFile", inputName, inputData);

    await ffmpeg.run(...args);
    const data = ffmpeg.FS("readFile", outName);
    const blob = new Blob([data.buffer], { type: format === "mp3" ? "audio/mpeg" : format === "m4a" ? "audio/mp4" : format === "wav" ? "audio/wav" : "audio/webm" });

    // cleanup
    try {
      ffmpeg.FS("unlink", inputName);
      ffmpeg.FS("unlink", outName);
    } catch {}

    const outFile = new File([blob], `converted.${format}`, { type: blob.type });
    return outFile;
  } else if (raw?.FFmpeg) {
    // newer class-based API
    const FFmpegClass = raw.FFmpeg || raw.default?.FFmpeg;
    const ffmpeg = new FFmpegClass();
    await ffmpeg.load();

    // write input using browser File -> Uint8Array
    const buf = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, buf);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outName);
    const blob = new Blob([data.buffer], { type: format === "mp3" ? "audio/mpeg" : format === "m4a" ? "audio/mp4" : format === "wav" ? "audio/wav" : "audio/webm" });

    // cleanup
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outName);
    } catch {}

    const outFile = new File([blob], `converted.${format}`, { type: blob.type });
    return outFile;
  } else {
    const top = raw ? Object.keys(raw).join(", ") : "(no module)";
    throw new Error(`@ffmpeg/ffmpeg import did not expose a usable API. top keys: ${top}`);
  }
}

/**
 * Convert a video File to audio (using ffmpeg.wasm in-browser) and then upload the audio for transcription.
 */
export async function transcribeVideoFile(videoFile: File, opts: TranscribeFromVideoOptions = {}) {
  const { format = "mp3", audioFilename, transcriptOptions = {}, onProgress } = opts;

  try {
    onProgress?.("Starting audio extraction (ffmpeg)");

    const audioFile = await convertFileWithFFmpeg(videoFile, format);

    // optionally rename
    const finalAudioFile = audioFilename ? new File([audioFile], audioFilename, { type: audioFile.type }) : audioFile;

    onProgress?.("Audio extraction complete — uploading for transcription");

    const apiOpts: GetTranscriptOptions = {
      model: transcriptOptions.model || "whisper-1",
      language: transcriptOptions.language || "en",
      min_words_for_sentiment: 4,
      baseURL: transcriptOptions.baseURL,
    } as GetTranscriptOptions;
    const res = await getTranscript(finalAudioFile, apiOpts);

    onProgress?.("Transcription complete");
    return res;
  } catch (err) {
    onProgress?.("Error during transcribeVideoFile: " + String(err));
    throw err;
  }
}

/**
 * Prompt the user to pick a single video file (via a hidden input) and transcribe it.
 * Returns the transcription response or null if the user cancelled.
 */
export async function pickVideoAndTranscribe(opts: TranscribeFromVideoOptions = {}) {
  return new Promise<any | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.multiple = false;

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const res = await transcribeVideoFile(file, opts);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });

    input.click();
  });
}
