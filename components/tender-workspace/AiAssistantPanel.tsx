"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiUsageChip } from "./AiUsageChip";
import { BriefTab } from "./tabs/BriefTab";
import { CoverLetterTab } from "./tabs/CoverLetterTab";
import { ChatTab } from "./tabs/ChatTab";
import { getAiUsage } from "@/lib/mocks/ai";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { useTenderUsage } from "@/lib/hooks/useTenderUsage";
import type { UpsellFeature } from "@/components/Modals/UpsellModal";

interface AiAssistantPanelProps {
  tenderId: string;
  selectedFileId?: string;
  className?: string;
  onUpsell: (feature: UpsellFeature) => void;
}

export function AiAssistantPanel({
  tenderId,
  selectedFileId,
  className,
  onUpsell,
}: AiAssistantPanelProps) {
  const usage = getAiUsage();
  const { data: entitlements } = useEntitlements();
  const {
    usedChats,
    usedBriefs,
    briefCredits,
    mutate: mutateUsage,
  } = useTenderUsage(tenderId);

  const chatLimit =
    typeof entitlements?.limits.chatPerTender === "number"
      ? entitlements.limits.chatPerTender
      : 2;

  const briefLimit =
    typeof entitlements?.limits.briefPerTender === "number"
      ? entitlements.limits.briefPerTender
      : 1;

  const briefTotal =
    typeof entitlements?.limits.briefsPerTrial === "number"
      ? entitlements.limits.briefsPerTrial
      : 3;

  const derivedBriefCredits =
    typeof briefCredits === "number"
      ? briefCredits
      : entitlements?.limits.briefsPerTrial ?? null;

  const refreshUsage = () => {
    void mutateUsage();
  };

  return (
    <div className={className}>
      <Tabs defaultValue="chat" className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
          <AiUsageChip used={usage.used} total={usage.total} />
        </div>

        {/* Tabs Navigation */}
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-none border-b border-gray-200 bg-transparent p-0">
          <TabsTrigger
            value="brief"
            className="rounded-none border-b-2 border-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Brief
          </TabsTrigger>
          <TabsTrigger
            value="letter"
            className="rounded-none border-b-2 border-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Cover Letter
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="brief" className="m-0 h-full">
            <BriefTab
              tenderId={tenderId}
              selectedFileId={selectedFileId}
              briefCredits={derivedBriefCredits}
              usedBriefs={usedBriefs}
              briefLimit={briefLimit}
              briefTotal={briefTotal}
              onUpsell={onUpsell}
              onUsageChange={refreshUsage}
            />
          </TabsContent>

          <TabsContent value="letter" className="m-0 h-full">
            <CoverLetterTab tenderId={tenderId} />
          </TabsContent>

          <TabsContent value="chat" className="m-0 h-full">
            <ChatTab
              tenderId={tenderId}
              selectedFileId={selectedFileId}
              usedChats={usedChats}
              chatLimit={chatLimit}
              onUpsell={onUpsell}
              onUsageChange={refreshUsage}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

