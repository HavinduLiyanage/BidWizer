"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, FileText, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEnsureDocIndex } from "../hooks/useEnsureDocIndex";

interface ChatTabProps {
  tenderId: string;
  selectedFileId?: string;
  selectedFolderPath?: string; // unused in V1
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ docName: string; page: number | null; snippet?: string }>;
  timestamp: Date;
};

export function ChatTab({ tenderId, selectedFileId }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useEnsureDocIndex(tenderId, selectedFileId);
  const canInteract =
    index.status === "ready" && Boolean(index.docHash) && Boolean(index.fileId);

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [selectedFileId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !canInteract) {
      return;
    }

    const question = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(
        `/api/tenders/${tenderId}/docs/${index.docHash}/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, fileId: index.fileId }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      let assistantContent = "I couldn't find that in this file.";
      let citations: Message["citations"] = undefined;

      if (response.ok) {
        if (typeof payload?.content === "string" && payload.content.trim().length > 0) {
          assistantContent = payload.content.trim();
        }
        if (Array.isArray(payload?.citations)) {
          const mapped = payload.citations
            .map(
              (citation: {
                docName?: string;
                page?: number | null;
                snippet?: string | null;
              }) => ({
                docName: citation?.docName ?? "Document",
                page:
                  typeof citation?.page === "number" ? citation.page : null,
                snippet:
                  typeof citation?.snippet === "string"
                    ? citation.snippet
                    : undefined,
              }),
            )
            .filter((entry) => entry.docName);
          citations = mapped.length > 0 ? mapped : undefined;
        }
      } else if (response.status === 422) {
        if (typeof payload?.error === "string" && payload.error.length > 0) {
          assistantContent = payload.error;
        }
      } else {
        const errorMessage =
          typeof payload?.message === "string" && payload.message.trim().length > 0
            ? payload.message
            : typeof payload?.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : "Request failed";
        throw new Error(errorMessage);
      }

      const assistant: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        citations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistant]);
    } catch (error) {
      console.error("Chat send failed:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "Sorry - something went wrong.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white/70 px-4 py-2">
        <p className="text-xs text-gray-600">
          Chatting with the <strong>open file</strong> only.
        </p>
        {index.status === "preparing" && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Indexing in progress…</span>
          </div>
        )}
        {index.status === "error" && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Index error: {index.message ?? "Unknown error"}</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <Send className="h-6 w-6 text-green-500" />
            </div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              Ask me anything in this file
            </p>
            <p className="max-w-xs text-xs text-gray-500">
              I&apos;ll cite pages from this PDF only.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-4 flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-xs",
                message.role === "user"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-800",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
              {message.role === "assistant" &&
                message.citations &&
                message.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.citations.map((citation, index) => (
                      <Badge
                        key={`${citation.docName}-${citation.page ?? "na"}-${index}`}
                        variant="outline"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (typeof citation.page === "number") {
                            window.dispatchEvent(
                              new CustomEvent("bidwizer:scrollToPage", {
                                detail: { page: citation.page },
                              }),
                            );
                          }
                        }}
                        onKeyDown={(event) => {
                          if (
                            (event.key === "Enter" || event.key === " ") &&
                            typeof citation.page === "number"
                          ) {
                            event.preventDefault();
                            window.dispatchEvent(
                              new CustomEvent("bidwizer:scrollToPage", {
                                detail: { page: citation.page },
                              }),
                            );
                          }
                        }}
                        title={citation.snippet}
                        className="cursor-pointer text-[10px]"
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        {citation.docName}
                        {typeof citation.page === "number"
                          ? ` [p.${citation.page}]`
                          : ""}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        <div ref={scrollRef} />
      </ScrollArea>

      <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canInteract || isSending}
            placeholder={
              canInteract
                ? "Ask about this file..."
                : index.status === "error"
                ? "Index unavailable"
                : "Preparing index..."
            }
            className="h-9 text-xs"
          />
          <Button
            onClick={() => void send()}
            disabled={!canInteract || isSending}
            className="h-9 text-xs"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-3.5 w-3.5" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
