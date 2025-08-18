import { useState, useRef, useEffect } from "react";
import { Mic, Plus, Send } from "lucide-react";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
      setIsExpanded(textarea.scrollHeight > 50);
    }
  }, [message]);

  return (
    <div
      className={`w-full flex items-end gap-2 bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 ${
        isExpanded ? "rounded-xl" : "rounded-full"
      }`}
    >
      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <Plus size={20} />
      </button>

      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      />

      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <Mic size={20} />
      </button>

      <button
        className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
        disabled={!message.trim()}
        onClick={() => {
          console.log("Send:", message);
          setMessage("");
        }}
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default ChatInput;
