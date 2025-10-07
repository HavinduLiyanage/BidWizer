"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiUsageChip } from "./AiUsageChip";
import { BriefTab } from "./tabs/BriefTab";
import { CoverLetterTab } from "./tabs/CoverLetterTab";
import { ChatTab } from "./tabs/ChatTab";
import { getAiUsage } from "@/lib/mocks/ai";

interface AiAssistantPanelProps {
  tenderId: string;
  selectedFileId?: string;
  selectedFolderPath?: string;
  className?: string;
}

export function AiAssistantPanel({
  tenderId,
  selectedFileId,
  selectedFolderPath,
  className,
}: AiAssistantPanelProps) {
  const usage = getAiUsage();

  return (
    <div className={className}>
      <Tabs defaultValue="chat" className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
          <AiUsageChip used={usage.used} total={usage.total} />
        </div>

        {/* Tabs Navigation */}
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-gray-200 h-10 bg-transparent p-0">
          <TabsTrigger
            value="brief"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
          >
            Brief
          </TabsTrigger>
          <TabsTrigger
            value="letter"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
          >
            Cover Letter
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
          >
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="brief" className="h-full m-0">
            <BriefTab tenderId={tenderId} scope={selectedFileId ? "file" : "entire"} />
          </TabsContent>

          <TabsContent value="letter" className="h-full m-0">
            <CoverLetterTab tenderId={tenderId} />
          </TabsContent>

          <TabsContent value="chat" className="h-full m-0">
            <ChatTab
              tenderId={tenderId}
              selectedFileId={selectedFileId}
              selectedFolderPath={selectedFolderPath}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

