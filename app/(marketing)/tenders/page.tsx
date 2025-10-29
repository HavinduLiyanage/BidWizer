"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { TenderCard } from "@/components/tenders/tender-card";
import { FilterDrawer } from "@/components/tenders/filter-drawer";
import { TenderSkeleton } from "@/components/tenders/tender-skeleton";
import { FollowedPublishers } from "@/components/tenders/followed-publishers";
import { AnalyticsChips } from "@/components/tenders/analytics-chips";
import { TenderPreviewModal } from "@/components/tenders/tender-preview-modal";
import type { Tender } from "@/lib/mock-data";

function toIsoString(
  value: string | Date | null | undefined,
  fallback?: string | Date | null
): string {
  const primary = value ? new Date(value) : undefined;
  if (primary && !Number.isNaN(primary.getTime())) {
    return primary.toISOString();
  }

  const fallbackDate = fallback ? new Date(fallback) : new Date();
  if (!Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate.toISOString();
  }

  return new Date().toISOString();
}

function buildAvatarUrl(name: string): string {
  const encodedName = encodeURIComponent(name || "Publisher");
  return `https://ui-avatars.com/api/?name=${encodedName}&background=2563EB&color=fff`;
}

function mapTender(raw: any): Tender {
  const publisherName =
    raw?.publisher?.name ??
    raw?.organization?.name ??
    "Publisher";

  const publisherId =
    raw?.publisher?.id ??
    raw?.organization?.id ??
    raw?.organizationId ??
    "publisher";

  const publishedDate = toIsoString(
    raw?.publishedDate ?? raw?.publishedAt ?? raw?.createdAt
  );

  const deadline = toIsoString(raw?.deadline, publishedDate);

  const statusValue = typeof raw?.status === "string" ? raw.status : "Active";

  const statusLabel =
    statusValue === "Draft"
      ? "Draft"
      : statusValue === "Closed"
      ? "Closed"
      : statusValue === "Cancelled"
      ? "Cancelled"
      : statusValue === "Awarded"
      ? "Awarded"
      : "Active";

  return {
    id: raw?.id ?? `tender-${Math.random().toString(36).slice(2)}`,
    title: raw?.title ?? "Untitled tender",
    publisher: {
      id: publisherId,
      name: publisherName,
      logo:
        raw?.publisher?.logo ??
        raw?.organization?.logo ??
        buildAvatarUrl(publisherName),
    },
    category: raw?.category ?? "General",
    deadline,
    status: statusLabel as Tender["status"],
    description: raw?.description ?? "",
    publishedDate,
    budget: raw?.budget ?? raw?.estimatedValue ?? undefined,
    type: raw?.type ?? "Public",
    location: raw?.location ?? raw?.regionLocation ?? undefined,
  };
}

export default function TendersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("deadline");
  const [showClosed, setShowClosed] = useState(false);
  const [previewTender, setPreviewTender] = useState<Tender | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadTenders() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const response = await fetch("/api/public/tenders", {
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error ?? "Failed to load tenders");
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.tenders)
          ? payload.tenders.map(mapTender)
          : [];

        if (isMounted) {
          setTenders(items);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load tenders:", error);
        if (isMounted) {
          setFetchError(
            error instanceof Error ? error.message : "Unable to load tenders"
          );
          setTenders([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTenders();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const filteredTenders = useMemo(() => {
    return tenders.filter((tender) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        tender.title.toLowerCase().includes(query) ||
        tender.category.toLowerCase().includes(query) ||
        tender.publisher.name.toLowerCase().includes(query) ||
        tender.description.toLowerCase().includes(query);

      if (!matchesSearch) {
        return false;
      }

      const matchesStatus = showClosed ? true : tender.status === "Active";
      return matchesStatus;
    });
  }, [tenders, searchQuery, showClosed]);

  const resultsCount = filteredTenders.length;

  const activeTenders = useMemo(
    () => tenders.filter((t) => t.status === "Active"),
    [tenders]
  );

  const newThisWeek = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    return tenders.filter((tender) => {
      const publishedAt = new Date(tender.publishedDate).getTime();
      return Number.isFinite(publishedAt) && now - publishedAt <= weekMs;
    }).length;
  }, [tenders]);

  const topCategory = useMemo(() => {
    if (tenders.length === 0) {
      return "General";
    }

    const categoryCounts = tenders.reduce<Record<string, number>>(
      (acc, tender) => {
        acc[tender.category] = (acc[tender.category] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0];
  }, [tenders]);

  return (
    <>
      <SiteHeader variant="page" />

      <main className="flex-1 bg-[#F9FAFB] min-h-screen">
        {/* Sticky Hero Section with Blur */}
        <div className="sticky top-16 bg-white/95 backdrop-blur-md border-b border-gray-200 z-30 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <div className="mb-6">
              <motion.h1
                className="text-3xl font-bold text-gray-900 mb-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Tenders
              </motion.h1>
              <motion.p
                className="text-gray-600 text-base mb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                Discover opportunities tailored to your business.
              </motion.p>
              <motion.p
                className="text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Active Tenders: {activeTenders.length} - Updated daily
              </motion.p>
            </div>

            {/* Search & Filter Bar */}
            <motion.div
              className="flex flex-col md:flex-row gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tenders, industries, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-gray-300 focus:border-primary focus:ring-primary/20 rounded-xl shadow-sm transition-all hover:shadow-md"
                />
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {/* Sort Dropdown */}
                <button className="flex items-center gap-2 px-4 h-11 border border-gray-300 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all text-sm font-medium text-gray-700 shadow-sm">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Sort by</span>
                </button>

                {/* Filters Button */}
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="flex items-center gap-2 px-4 h-11 border border-gray-300 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all text-sm font-medium text-gray-700 shadow-sm"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>

                {/* Active/All Toggle */}
                <div className="relative flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                  <motion.div
                    className="absolute inset-0 bg-gray-900"
                    initial={false}
                    animate={{
                      x: showClosed ? "50%" : "0%",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    style={{ width: "50%" }}
                  />
                  <button
                    onClick={() => setShowClosed(false)}
                    className={`relative z-10 px-4 h-11 text-sm font-medium transition-colors ${
                      !showClosed ? "text-white" : "text-gray-700"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setShowClosed(true)}
                    className={`relative z-10 px-4 h-11 text-sm font-medium transition-colors ${
                      showClosed ? "text-white" : "text-gray-700"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Results counter */}
            {searchQuery && (
              <motion.div
                className="mt-4 text-sm text-gray-600"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {resultsCount} {resultsCount === 1 ? "result" : "results"} found
              </motion.div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Tenders */}
            <div className="lg:col-span-8">
              {/* Analytics Chips */}
              <AnalyticsChips
                newThisWeek={newThisWeek}
                topCategory={topCategory}
                totalActive={activeTenders.length}
              />

              {/* Optional AI Banner */}
              <motion.div
                className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center gap-3 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    AI-powered insights coming soon
                  </p>
                  <p className="text-xs text-gray-600">
                    Get instant tender summaries and personalized recommendations
                  </p>
                </div>
              </motion.div>

              {/* Tenders Grid */}
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-6"
                  >
                    {[1, 2, 3, 4].map((i) => (
                      <TenderSkeleton key={i} />
                    ))}
                  </motion.div>
                ) : fetchError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
                  >
                    {fetchError}
                  </motion.div>
                ) : filteredTenders.length > 0 ? (
                  <motion.div key="tenders" className="grid grid-cols-1 gap-6">
                    {filteredTenders.map((tender, idx) => (
                      <motion.div
                        key={tender.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.3 }}
                      >
                        <TenderCard tender={tender} onPreview={setPreviewTender} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center py-20 px-4"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6">
                      <Search className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No tenders match your filters
                    </h3>
                    <p className="text-sm text-gray-600 mb-6 text-center max-w-sm">
                      Try adjusting search terms or category filters to find what you are looking for.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setShowClosed(false);
                      }}
                      className="px-6 py-3 text-sm font-medium text-white bg-primary hover:bg-primary-600 rounded-xl transition-colors shadow-sm hover:shadow-md"
                    >
                      Reset filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Sidebar - Followed Publishers */}
            <aside className="lg:col-span-4">
              <motion.div
                className="sticky top-40"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <FollowedPublishers />
              </motion.div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(filters) => console.log("Applied filters:", filters)}
      />

      {/* Tender Preview Modal */}
      <TenderPreviewModal
        tender={previewTender}
        isOpen={!!previewTender}
        onClose={() => setPreviewTender(null)}
      />
    </>
  );
}
