"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BriefLength } from "@/lib/mocks/ai";
import { useEnsureDocIndex } from "../hooks/useEnsureDocIndex";

type BriefJson = {
  purpose?: string[];
  key_requirements?: string[];
  eligibility?: string[];
  submission?: {
    deadline?: string;
    method?: string;
    bid_security?: string;
  };
  risks?: string[];
  [key: string]: unknown;
};

interface BriefTabProps {
  tenderId: string;
  selectedFileId?: string;
}

export function BriefTab({ tenderId, selectedFileId }: BriefTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [length, setLength] = useState<BriefLength>("medium");
  const [brief, setBrief] = useState<BriefJson | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const index = useEnsureDocIndex(tenderId, selectedFileId);
  const canGenerate =
    index.status === "ready" && Boolean(index.docHash) && Boolean(index.fileId);

  useEffect(() => {
    setBrief(null);
    setMarkdown("");
    setErrorMessage(null);
  }, [selectedFileId]);

  const sections = useMemo(() => {
    if (!brief) return [];

    const entries: Array<{ title: string; points: string[] }> = [];

    if (Array.isArray(brief.purpose) && brief.purpose.length > 0) {
      entries.push({ title: "Purpose", points: brief.purpose });
    }
    if (Array.isArray(brief.key_requirements) && brief.key_requirements.length > 0) {
      entries.push({ title: "Key Requirements", points: brief.key_requirements });
    }
    if (Array.isArray(brief.eligibility) && brief.eligibility.length > 0) {
      entries.push({ title: "Eligibility", points: brief.eligibility });
    }
    if (brief.submission) {
      const submissionPoints: string[] = [];
      if (brief.submission.deadline) {
        submissionPoints.push(`Deadline: ${brief.submission.deadline}`);
      }
      if (brief.submission.method) {
        submissionPoints.push(`Method: ${brief.submission.method}`);
      }
      if (brief.submission.bid_security) {
        submissionPoints.push(`Bid security: ${brief.submission.bid_security}`);
      }
      if (submissionPoints.length > 0) {
        entries.push({ title: "Submission", points: submissionPoints });
      }
    }
    if (Array.isArray(brief.risks) && brief.risks.length > 0) {
      entries.push({ title: "Risks", points: brief.risks });
    }

    return entries;
  }, [brief]);

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating || !index.docHash || !index.fileId) return;

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/tenders/${tenderId}/docs/${index.docHash}/brief`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ length, fileId: index.fileId }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setBrief(payload?.briefJson ?? null);
        setMarkdown(
          typeof payload?.markdown === "string"
            ? payload.markdown
            : "I couldn't find that in this file.",
        );
      } else if (response.status === 422) {
        setBrief(null);
        setMarkdown("");
        setErrorMessage(
          typeof payload?.error === "string"
            ? payload.error
            : "No indexed content for this file.",
        );
      } else {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : `Brief endpoint returned ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Brief generation failed:", error);
      setBrief(null);
      setMarkdown("");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate brief.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-600">
          Brief is generated from the <strong>open PDF</strong> only.
        </p>
        {index.status === "preparing" && (
          <p className="text-[10px] text-gray-500">Preparing index...</p>
        )}
        {index.status === "error" && (
          <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <p className="text-[10px] text-red-600">
              {index.message ?? "Unable to prepare document index."}
            </p>
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-start text-xs"
            >
              <FileText className="mr-2 h-3.5 w-3.5" />
              Length: {length.charAt(0).toUpperCase() + length.slice(1)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60" align="start">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Brief Length</h4>
              <RadioGroup
                value={length}
                onValueChange={(value) => setLength(value as BriefLength)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="length-short" />
                  <Label
                    htmlFor="length-short"
                    className="cursor-pointer text-xs font-normal"
                  >
                    Short - Key points only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="length-medium" />
                  <Label
                    htmlFor="length-medium"
                    className="cursor-pointer text-xs font-normal"
                  >
                    Medium - Balanced overview
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="length-long" />
                  <Label
                    htmlFor="length-long"
                    className="cursor-pointer text-xs font-normal"
                  >
                    Long - Comprehensive details
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          onClick={() => void handleGenerate()}
          disabled={!canGenerate || isGenerating}
          className="h-9 w-full text-xs"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-3.5 w-3.5" />
              Generate Brief
            </>
          )}
        </Button>
        {errorMessage && (
          <p className="text-[10px] text-red-600">{errorMessage}</p>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        {!brief && !markdown && !isGenerating && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              No brief generated
            </p>
            <p className="mt-1 max-w-xs text-xs text-gray-500">
              Click the Generate Brief button once the document index is ready.
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-5/6 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {(sections.length > 0 || markdown) && !isGenerating && (
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={`${section.title}-${index}`} className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {section.title}
                </h4>
                <ul className="ml-6 space-y-1.5">
                  {section.points.map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className="flex gap-2 text-xs leading-relaxed text-gray-700"
                    >
                      <span className="mt-0.5 text-gray-400">-</span>
                      <span className="flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {markdown && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Markdown brief
                </p>
                <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-800">
                  {markdown}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
