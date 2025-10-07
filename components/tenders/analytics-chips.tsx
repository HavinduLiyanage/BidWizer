"use client";

import { TrendingUp, Package, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AnalyticsChipsProps {
  newThisWeek: number;
  topCategory: string;
  totalActive: number;
}

export function AnalyticsChips({ newThisWeek, topCategory, totalActive }: AnalyticsChipsProps) {
  const chips = [
    {
      icon: TrendingUp,
      label: `${newThisWeek} new tenders this week`,
      color: "bg-green-50 text-green-700 border-green-200"
    },
    {
      icon: Package,
      label: `Top category: ${topCategory}`,
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      icon: Sparkles,
      label: `${totalActive} opportunities available`,
      color: "bg-purple-50 text-purple-700 border-purple-200"
    }
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {chips.map((chip, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.3 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${chip.color} transition-all hover:shadow-sm`}
        >
          <chip.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{chip.label}</span>
        </motion.div>
      ))}
    </div>
  );
}


