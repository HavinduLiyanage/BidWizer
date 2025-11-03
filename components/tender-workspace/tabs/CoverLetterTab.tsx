"use client";

import { useState } from "react";
import { FileText, Loader2, Copy, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface CoverLetterTabProps {
  tenderId: string;
}

export function CoverLetterTab({ tenderId }: CoverLetterTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [letter, setLetter] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    tone: "professional" as "formal" | "professional" | "friendly",
    length: "standard" as "concise" | "standard" | "detailed",
    strengths: "",
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/tenders/${tenderId}/ai/cover-letter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tone: formData.tone === "friendly" ? "concise" : "professional",
            length:
              formData.length === "concise"
                ? "short"
                : formData.length === "detailed"
                ? "detailed"
                : "standard",
            customNotes: formData.strengths,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Cover letter API returned ${response.status}`);
      }

      const payload = await response.json().catch(() => ({}));
      setLetter(payload?.letterMarkdown ?? "");
      setCopied(false);
    } catch (error) {
      console.error("Failed to generate cover letter:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Form */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="company" className="text-xs font-medium">
                Company Name (optional)
              </Label>
              <Input
                id="company"
                placeholder="Auto from profile (optional override)"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="tone" className="text-xs font-medium">
                  Tone
                </Label>
                <Select
                  value={formData.tone}
                  onValueChange={(v) =>
                    setFormData({ ...formData, tone: v as typeof formData.tone })
                  }
                >
                  <SelectTrigger id="tone" className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal" className="text-xs">
                      Formal
                    </SelectItem>
                    <SelectItem value="professional" className="text-xs">
                      Professional
                    </SelectItem>
                    <SelectItem value="friendly" className="text-xs">
                      Friendly
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="length" className="text-xs font-medium">
                  Length
                </Label>
                <Select
                  value={formData.length}
                  onValueChange={(v) =>
                    setFormData({ ...formData, length: v as typeof formData.length })
                  }
                >
                  <SelectTrigger id="length" className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise" className="text-xs">
                      Concise
                    </SelectItem>
                    <SelectItem value="standard" className="text-xs">
                      Standard
                    </SelectItem>
                    <SelectItem value="detailed" className="text-xs">
                      Detailed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="strengths" className="text-xs font-medium">
                Key Strengths (Optional)
              </Label>
              <Textarea
                id="strengths"
                placeholder="e.g., 15 years experience, ISO certified, modern equipment..."
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                className="mt-1 text-xs min-h-[60px]"
                rows={3}
              />
            </div>

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
                  Generate Letter
                </>
              )}
            </Button>
            <p className="text-[10px] text-gray-500">
              Cover Letter uses tender details only (no PDFs).
            </p>
          </div>

          {/* Preview */}
          {letter && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-700">Preview</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-white">
                <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {letter}
                </pre>
              </div>
            </div>
          )}

          {!letter && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 max-w-xs">
                Fill in the form above and click &quot;Generate Letter&quot; to create a customized cover
                letter
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

