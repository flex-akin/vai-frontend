import { useState, useCallback } from "react";
import { pickVideoAndTranscribe } from "../services/utils/transcribeFromVideo";
import type { TranscribeFromVideoOptions } from "../services/utils/transcribeFromVideo";

export default function useTranscribeFromPicker() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const start = useCallback(
    async (opts: TranscribeFromVideoOptions = {}) => {
      setLoading(true);
      setProgress(null);
      setError(null);
      setResult(null);
      try {
        const res = await pickVideoAndTranscribe({
          ...opts,
          onProgress: (m: string) => {
            setProgress(m);
          },
        });
        setResult(res ?? null);
        setLoading(false);
        return res;
      } catch (err) {
        setError(err);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  return { loading, progress, error, result, start } as const;
}
