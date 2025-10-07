"use client";

import Link from "next/link";
import { MapPin, Calendar, DollarSign, Building2, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { Tender } from "@/lib/mock-data";

interface TenderCardProps {
  tender: Tender;
  onPreview?: (tender: Tender) => void;
}

const categoryColors: Record<string, { bg: string; text: string; badge: string }> = {
  "Construction": { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100" },
  "Healthcare": { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100" },
  "Infrastructure": { bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100" },
  "IT & Technology": { bg: "bg-indigo-50", text: "text-indigo-700", badge: "bg-indigo-100" },
  "Energy": { bg: "bg-rose-50", text: "text-rose-700", badge: "bg-rose-100" }
};

export function TenderCard({ tender, onPreview }: TenderCardProps) {
  // Calculate days left
  const getDaysLeft = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysLeft(tender.deadline);
  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft <= 7;
  const categoryColor = categoryColors[tender.category] || categoryColors["Construction"];

  // Get urgency color
  const getUrgencyColor = () => {
    if (isExpired) return "text-red-600 bg-red-50";
    if (daysLeft <= 7) return "text-red-600 bg-red-50";
    if (daysLeft <= 14) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group relative bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 ${
        isExpired ? 'bg-gray-50/50 opacity-75' : ''
      }`}
    >
      {/* Top row: Avatar + Category */}
      <div className="flex items-start justify-between mb-4">
        {/* Publisher Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-900 to-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">
              {tender.publisher.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
            </span>
          </div>
        </div>

        {/* Category Badge */}
        <Badge 
          className={`${categoryColor.badge} ${categoryColor.text} border-0 font-medium px-3 py-1 text-xs`}
        >
          {tender.category}
        </Badge>
      </div>

      {/* Title */}
      <Link href={`/tenders/${tender.id}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {tender.title}
        </h3>
      </Link>

      {/* Publisher + Location + Deadline meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          <span>{tender.publisher.name}</span>
        </div>
        {tender.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{tender.location}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
        {tender.description}
      </p>

      {/* Budget + Deadline Row */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
        {tender.budget && (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium">Budget</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {tender.budget}
            </div>
          </div>
        )}
        
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium">Deadline</span>
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {new Date(tender.deadline).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Footer: Status + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${tender.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-medium">{tender.status}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{new Date(tender.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <span className="text-gray-400">·</span>
          <span>{tender.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Urgency badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getUrgencyColor()}`}>
            <Clock className="h-3 w-3" />
            {isExpired ? 'Expired' : `${daysLeft}d left`}
          </div>
        </div>
      </div>

      {/* View Tender Button */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
          onClick={() => onPreview?.(tender)}
        >
          Quick View
        </Button>
        <Link href={`/tenders/${tender.id}`} className="flex-1">
          <Button className="w-full">
            Full Details
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

