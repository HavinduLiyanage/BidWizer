import { cn } from "@/lib/utils";

interface UsageChipProps {
  used: number;
  limit: number;
  period?: string;
}

export function UsageChip({ used, limit, period = "this month" }: UsageChipProps) {
  const percentage = (used / limit) * 100;
  const isNearLimit = percentage >= 80;

  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        isNearLimit
          ? "bg-orange-100 text-orange-700"
          : "bg-blue-100 text-blue-700"
      )}
    >
      {used}/{limit} {period}
    </div>
  );
}

