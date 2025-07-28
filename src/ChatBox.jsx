import React, { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export default function ChatBox({ universal, sources }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const send = async () => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    // placeholder call
    const reply = await invoke("ask_llm", { prompt: text });
    setMessages((m) => [...m, { role: "assistant", text: reply }]);
    setLoading(false);
    setText("");
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2">
            <strong>{msg.role}:</strong> {msg.text}
          </div>
        ))}
        {loading && <div className="animate-pulse">•••</div>}
      </div>
      <div className="p-2 border-t border-gray-300">
        <textarea
          ref={textareaRef}
          className="w-full resize-none bg-[#2d2e33] text-white rounded p-2"
          rows={Math.min(5, text.split("\n").length)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask anything..."
        />
        <button onClick={send} className="mt-2 bg-primary text-white px-4 py-1 rounded">
          {loading ? "Stop" : "Send"}
        </button>
      </div>
    </div>
  );
}
