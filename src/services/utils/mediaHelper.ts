import fs from "fs/promises";
import path from "path";

export async function convertVideoToAudio(
  inputPath: string,
  outputPath?: string,
  format: "mp3" | "wav" | "m4a" = "mp3"
): Promise<string> {
  // dynamic import to avoid type issues at module evaluation time
  const ffmpegModule = (await import("@ffmpeg/ffmpeg")) as any;
  const { createFFmpeg, fetchFile } = ffmpegModule;

  const ffmpeg = createFFmpeg({ log: true });
  console.log("🚀 Loading ffmpeg.wasm...");
  await ffmpeg.load();

  const inputName = path.basename(inputPath);
  const outputName =
    outputPath ?? path.join(path.dirname(inputPath), `${path.parse(inputName).name}.${format}`);

  // Read and load input file
  const fileData = await fetchFile(inputPath);
  ffmpeg.FS("writeFile", inputName, fileData);

  const codec = format === "wav" ? "pcm_s16le" : format === "m4a" ? "aac" : "libmp3lame";

  console.log(`🎬 Converting ${inputName} → ${outputName}`);
  await ffmpeg.run("-i", inputName, "-vn", "-acodec", codec, path.basename(outputName));

  // Retrieve result and write to disk
  const outputData = ffmpeg.FS("readFile", path.basename(outputName));
  await fs.writeFile(outputName, outputData);

  console.log(`✅ Conversion complete: ${outputName}`);
  return outputName;
}
