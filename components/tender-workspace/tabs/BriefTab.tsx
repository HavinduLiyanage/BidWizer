"use client";

import { useState } from "react";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBrief, type BriefLength, type BriefSection } from "@/lib/mocks/ai";

interface BriefTabProps {
  tenderId: string;
  scope: string;
}

export function BriefTab({ tenderId, scope }: BriefTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [brief, setBrief] = useState<BriefSection[] | null>(null);
  const [length, setLength] = useState<BriefLength>("medium");

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await getBrief(tenderId, scope, length);
      setBrief(result);
    } catch (error) {
      console.error("Failed to generate brief:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="px-4 py-3 border-b border-gray-200 space-y-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <FileText className="h-3.5 w-3.5 mr-2" />
              Length: {length.charAt(0).toUpperCase() + length.slice(1)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60" align="start">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Brief Length</h4>
              <RadioGroup value={length} onValueChange={(v) => setLength(v as BriefLength)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="short" />
                  <Label htmlFor="short" className="text-xs font-normal cursor-pointer">
                    Short - Key points only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-xs font-normal cursor-pointer">
                    Medium - Balanced overview
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="long" />
                  <Label htmlFor="long" className="text-xs font-normal cursor-pointer">
                    Long - Comprehensive details
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-xs h-9"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5 mr-2" />
              Generate Brief
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 py-4">
        {!brief && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No brief generated</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Click &quot;Generate Brief&quot; to get an AI-powered summary of this tender
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {brief && (
          <div className="space-y-6">
            {brief.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {section.title}
                </h4>
                <ul className="space-y-1.5 ml-6">
                  {section.points.map((point, pointIdx) => (
                    <li key={pointIdx} className="text-xs text-gray-700 leading-relaxed flex gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span className="flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

