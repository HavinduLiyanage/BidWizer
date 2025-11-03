"use client";

import { Building2, Bell, TrendingUp, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface FollowedPublisher {
  id: string;
  name: string;
  initials: string;
  activeTenders: number;
  newThisWeek: number;
  lastPosted: string;
  category: string;
}

const followedPublishers: FollowedPublisher[] = [
  {
    id: "1",
    name: "Ministry of Construction",
    initials: "MC",
    activeTenders: 8,
    newThisWeek: 2,
    lastPosted: "2 days ago",
    category: "Construction"
  },
  {
    id: "2",
    name: "Department of Health",
    initials: "DH",
    activeTenders: 5,
    newThisWeek: 1,
    lastPosted: "5 days ago",
    category: "Healthcare"
  },
  {
    id: "3",
    name: "Transport Authority",
    initials: "TA",
    activeTenders: 12,
    newThisWeek: 3,
    lastPosted: "1 day ago",
    category: "Infrastructure"
  },
  {
    id: "4",
    name: "National Water Board",
    initials: "NW",
    activeTenders: 3,
    newThisWeek: 0,
    lastPosted: "1 week ago",
    category: "Infrastructure"
  }
];

export function FollowedPublishers() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Following</h3>
            <p className="text-xs text-gray-500">{followedPublishers.length} publishers</p>
          </div>
        </div>
        <Link 
          href="/dashboard/following" 
          className="text-xs text-primary hover:underline font-medium"
        >
          Manage
        </Link>
      </div>

      {/* Publishers List */}
      <div className="space-y-2">
        {followedPublishers.map((publisher, idx) => (
          <motion.div
            key={publisher.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
          >
            <Link
              href={`/publishers/${publisher.id}`}
              className="group block p-4 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
            >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy-900 to-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">
                  {publisher.initials}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Name and Arrow */}
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                    {publisher.name}
                  </h4>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    <span className="font-medium">{publisher.activeTenders}</span>
                    <span className="text-gray-500">active</span>
                  </div>
                  {publisher.newThisWeek > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium">{publisher.newThisWeek} new</span>
                    </div>
                  )}
                </div>

                {/* Last Posted */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>Posted {publisher.lastPosted}</span>
                </div>
              </div>
            </div>

            {/* New Badge */}
            {publisher.newThisWeek > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <Badge className="bg-green-50 text-green-700 border-0 text-xs">
                  {publisher.newThisWeek} new tender{publisher.newThisWeek > 1 ? 's' : ''} this week
                </Badge>
              </div>
            )}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Follow More CTA */}
      <Link
        href="/publishers"
        className="block w-full p-3 text-center text-sm font-medium text-primary border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-blue-50 transition-all"
      >
        + Follow more publishers
      </Link>

      {/* Quick Stats */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-gray-900">This Week</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {followedPublishers.reduce((acc, p) => acc + p.newThisWeek, 0)}
            </div>
            <div className="text-xs text-gray-600">New tenders</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {followedPublishers.reduce((acc, p) => acc + p.activeTenders, 0)}
            </div>
            <div className="text-xs text-gray-600">Total active</div>
          </div>
        </div>
      </div>
    </div>
  );
}

