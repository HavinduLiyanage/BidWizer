import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AiUsageChipProps {
  used: number;
  total: number;
}

export function AiUsageChip({ used, total }: AiUsageChipProps) {
  const percentage = (used / total) * 100;
  const isNearLimit = percentage > 80;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
              isNearLimit
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>
              {used}/{total}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            AI questions used this month
            <br />
            <span className="text-muted-foreground">Resets monthly</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

