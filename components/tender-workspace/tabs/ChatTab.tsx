"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText, Folder, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askQuestion, getMockCitations, type ChatMessage } from "@/lib/mocks/ai";
import { cn } from "@/lib/utils";

interface ChatTabProps {
  tenderId: string;
  selectedFileId?: string;
  selectedFolderPath?: string;
}

export function ChatTab({ tenderId, selectedFileId, selectedFolderPath }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<"file" | "folder" | "entire">("entire");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-update scope based on selection
  useEffect(() => {
    if (selectedFileId) {
      setScope("file");
    } else if (selectedFolderPath) {
      setScope("folder");
    } else {
      setScope("entire");
    }
  }, [selectedFileId, selectedFolderPath]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Stream the response
      const generator = askQuestion({
        tenderId,
        scope,
        fileId: selectedFileId,
        folderPath: selectedFolderPath,
        question: input,
      });

      let fullResponse = "";
      const assistantMessageId = (Date.now() + 1).toString();

      for await (const chunk of generator) {
        fullResponse += chunk;
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === assistantMessageId);
          if (existing) {
            return prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullResponse } : m
            );
          } else {
            return [
              ...prev,
              {
                id: assistantMessageId,
                role: "assistant" as const,
                content: fullResponse,
                timestamp: new Date(),
                citations: getMockCitations(input),
              },
            ];
          }
        });
      }
    } catch (error) {
      console.error("Failed to get response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scope Selector */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
        <div className="flex gap-2">
          <button
            onClick={() => setScope("file")}
            disabled={!selectedFileId}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
              scope === "file"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <FileText className="h-3 w-3" />
            This file
          </button>
          <button
            onClick={() => setScope("folder")}
            disabled={!selectedFolderPath}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
              scope === "folder"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Folder className="h-3 w-3" />
            This folder
          </button>
          <button
            onClick={() => setScope("entire")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
              scope === "entire"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            )}
          >
            <Files className="h-3 w-3" />
            Entire tender
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Send className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Ask me anything</p>
            <p className="text-xs text-gray-500 max-w-xs mb-4">
              I can help you understand requirements, deadlines, budget, and more
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => setInput("What are the key requirements for this tender?")}
                className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                What are the key requirements?
              </button>
              <button
                onClick={() => setInput("What is the budget range for this project?")}
                className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                What is the budget range?
              </button>
              <button
                onClick={() => setInput("When is the submission deadline?")}
                className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                When is the submission deadline?
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-800"
                )}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    <p className="text-[10px] text-gray-500 font-medium mb-1">Sources:</p>
                    {message.citations.map((citation, idx) => (
                      <button
                        key={idx}
                        className="flex items-start gap-2 w-full p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-700 truncate">
                            {citation.docName}
                            {citation.page && ` · Page ${citation.page}`}
                          </p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">
                            {citation.snippet}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div ref={scrollRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this tender..."
            disabled={isLoading}
            className="flex-1 h-9 text-xs"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="h-9 px-3"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

