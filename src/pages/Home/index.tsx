// pages/index.tsx (or wherever your Home component lives)
import type { ChatMsg } from "../../components/ui/ChatHistory";
import ChatHistory from "../../components/ui/ChatHistory";
import ChatInputBox, { type VoiceEvent } from "../../components/ui/ChatInput";
import TranscriptList from "../../components/ui/TranscriptList";
import Player from "../../components/ui/VideoPlayer";
import { useState } from "react";

const fmt = (s: number) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
};

const Home = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [recordingMsgId, setRecordingMsgId] = useState<string | null>(null);

  const handleSend = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, ts: Date.now() },
    ]);
  };

  const handleVoiceEvent = (ev: VoiceEvent) => {
    if (ev.type === "recording-start") {
      const id = crypto.randomUUID();
      setRecordingMsgId(id);
      setMessages((prev) => [
        ...prev,
        { id, ts: Date.now(), text: "🎙️ Recording… 00:00" },
      ]);
      return;
    }

    if (ev.type === "recording-progress" && recordingMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === recordingMsgId
            ? { ...m, text: `🎙️ Recording… ${fmt(ev.elapsed)}` }
            : m
        )
      );
      return;
    }

    if (ev.type === "recording-pause" && recordingMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === recordingMsgId
            ? { ...m, text: `⏸️ Paused… ${fmt(ev.elapsed)}` }
            : m
        )
      );
      return;
    }

    if (ev.type === "recording-resume" && recordingMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === recordingMsgId
            ? { ...m, text: `🎙️ Recording… ${fmt(ev.elapsed)}` }
            : m
        )
      );
      return;
    }

    if (ev.type === "recording-stop" && recordingMsgId) {
      const { url, durationSec, file } = ev;
      // Replace the placeholder with an audio message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === recordingMsgId
            ? {
                ...m,
                text: undefined, // no raw text; render as audio
                audio: {
                  url,
                  durationSec,
                  mime: file.type,
                  filename: file.name,
                },
              }
            : m
        )
      );
      setRecordingMsgId(null);
      return;
    }

    if (ev.type === "recording-error") {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), ts: Date.now(), text: `⚠️ Mic error: ${ev.message}` },
      ]);
    }
  };

  return (
    <div className="flex">
      <div className="w-3/4 flex flex-col h-[96vh]">
        <h1 className="text-2xl font-bold p-4">Welcome to VideoAI</h1>

        <div className="flex flex-col flex-1 min-h-0 items-center">
          <div className="flex justify-center items-center">
            <Player />
          </div>

          <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto mt-4 mb-6 bg-[#181818] rounded-2xl p-4">
            <div className="m-2 rounded-4xl"></div>
            <h2 className="text-xl font-medium mb-4">Chat History</h2>
            <ChatHistory messages={messages} />
          </div>

          <div className="w-full flex justify-center items-center">
            <div className="max-w-3xl w-full">
              <ChatInputBox onSend={handleSend} onVoiceEvent={handleVoiceEvent} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-1/4 m-4 bg-[#181818] rounded-2xl overflow-y-auto h-[96vh] p-4">
        <div className="m-2 rounded-4xl"></div>
        <h2 className="text-xl font-semibold mb-4">Transcript</h2>
        <TranscriptList />
      </div>
    </div>
  );
};

export default Home;
