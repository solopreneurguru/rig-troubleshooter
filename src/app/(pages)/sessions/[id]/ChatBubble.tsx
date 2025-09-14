"use client";

import React from "react";

type Bubble = {
  role: "user" | "assistant" | "system";
  text: string;
};

export default function ChatBubble({ role, text }: Bubble) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={[
          "max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-blue-600/90 text-white"
            : isAssistant
              ? "bg-neutral-800 text-neutral-100 border border-neutral-700/60"
              : "bg-neutral-900 text-neutral-300 border border-neutral-800",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}
