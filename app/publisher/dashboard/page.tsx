"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Eye, Edit, TrendingUp, Trash2, Search, Calendar, DollarSign, Users } from "lucide-react";
import { motion } from "framer-motion";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TenderStatusCode = "DRAFT" | "PUBLISHED" | "CLOSED" | "AWARDED" | "CANCELLED";

interface PublisherTender {
  id: string;
  title: string;
  category: string;
  deadline: string | null;
  status: string;
  statusCode: TenderStatusCode;
  description: string;
  publishedDate: string | null;
  budget?: string | null;
}

const STATUS_LABELS: Record<TenderStatusCode, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Active",
  CLOSED: "Closed",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

const STATUS_FILTER_MAP: Record<string, TenderStatusCode[]> = {
  active: ["PUBLISHED"],
  draft: ["DRAFT"],
  closed: ["CLOSED"],
  awarded: ["AWARDED"],
  cancelled: ["CANCELLED"],
};

function mapTender(tender: any): PublisherTender {
  const statusCode: TenderStatusCode = (tender.status as TenderStatusCode) ?? "DRAFT";
  const deadlineValue =
    tender.deadline ? new Date(tender.deadline).toISOString() : null;
  const publishedValue =
    tender.publishedAt ? new Date(tender.publishedAt).toISOString() : null;

  return {
    id: tender.id,
    title: tender.title ?? "Untitled tender",
    category: tender.category ?? "Uncategorized",
    deadline: deadlineValue,
    statusCode,
    status: STATUS_LABELS[statusCode] ?? "Draft",
    description: tender.description ?? "",
    publishedDate: publishedValue,
    budget: tender.estimatedValue ?? null,
  };
}

export default function PublisherDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [publisherTenders, setPublisherTenders] = useState<PublisherTender[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTenders() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const response = await fetch("/api/tenders", {
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load tenders");
        }

        const payload = await response.json();
        const tenders = Array.isArray(payload?.tenders)
          ? payload.tenders.map(mapTender)
          : [];

        if (isMounted) {
          setPublisherTenders(tenders);
        }
      } catch (error) {
        console.error("Failed to fetch publisher tenders:", error);
        if (isMounted) {
          setFetchError(
            error instanceof Error ? error.message : "Unable to load tenders"
          );
          setPublisherTenders([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTenders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTenders = useMemo(() => {
    return publisherTenders.filter((tender) => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesSearch =
        normalizedQuery.length === 0 ||
        tender.title.toLowerCase().includes(normalizedQuery) ||
        tender.category.toLowerCase().includes(normalizedQuery);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      const statusCodes = STATUS_FILTER_MAP[statusFilter] ?? [];
      return statusCodes.includes(tender.statusCode);
    });
  }, [publisherTenders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = publisherTenders.length;
    const active = publisherTenders.filter((t) => t.statusCode === "PUBLISHED").length;
    const draft = publisherTenders.filter((t) => t.statusCode === "DRAFT").length;
    const totalViews = publisherTenders.reduce((sum, _, index) => sum + 120 + index * 15, 0);

    return { total, active, draft, totalViews };
  }, [publisherTenders]);

  return (
    <>
      <SiteHeader variant="page" />

      <main className="flex-1 bg-[#F9FAFB] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <motion.h1 
              className="text-3xl font-bold text-gray-900 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Publisher Dashboard
            </motion.h1>
            <motion.p 
              className="text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Manage your tenders and track their performance
            </motion.p>
          </div>

          {/* Stats Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="bg-white border-gray-200 shadow-sm h-24">
              <CardContent className="p-6 h-full flex items-center">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tenders</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm h-24">
              <CardContent className="p-6 h-full flex items-center">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Tenders</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm h-24">
              <CardContent className="p-6 h-full flex items-center">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Draft Tenders</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Edit className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm h-24">
              <CardContent className="p-6 h-full flex items-center">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Eye className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions Bar */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tenders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
                <option value="awarded">Awarded</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Link href="/publisher/tenders/new">
                <Button className="h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  New Tender
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Tenders Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="py-16 text-center text-sm text-gray-500">
                    Loading tenders&hellip;
                  </div>
                ) : fetchError ? (
                  <div className="py-16 text-center text-sm text-red-500">
                    {fetchError}
                  </div>
                ) : filteredTenders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Tender Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Published
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Deadline
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTenders.map((tender, index) => (
                          <motion.tr 
                            key={tender.id} 
                            className="hover:bg-gray-50 transition-colors"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-semibold text-gray-900 mb-1">
                                  {tender.title}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">
                                    {tender.category}
                                  </Badge>
                                  {tender.budget && (
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span>{tender.budget}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                className={`${
                                  tender.statusCode === "PUBLISHED"
                                    ? "bg-green-50 text-green-700"
                                    : tender.statusCode === "DRAFT"
                                    ? "bg-amber-50 text-amber-700"
                                    : tender.statusCode === "AWARDED"
                                    ? "bg-blue-50 text-blue-700"
                                    : tender.statusCode === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-gray-50 text-gray-700"
                                } border-0`}
                              >
                                {tender.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {tender.statusCode === "DRAFT" ? (
                                <span className="text-gray-400">Not published</span>
                              ) : (
                                tender.publishedDate
                                  ? new Date(tender.publishedDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : <span className="text-gray-400">Not set</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {tender.statusCode === "DRAFT" || !tender.deadline ? (
                                <span className="text-gray-400">TBD</span>
                              ) : (
                                new Date(tender.deadline).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {tender.statusCode === "DRAFT" ? (
                                <span className="text-gray-400 text-sm">No data available</span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Eye className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-700">
                                      {Math.floor(Math.random() * 1000) + 100} views
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-700">
                                      {Math.floor(Math.random() * 50) + 5} interested
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {tender.statusCode !== "DRAFT" && (
                                  <Link href={`/tenders/${tender.id}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-gray-100"
                                      aria-label="View tender"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                  aria-label="Edit tender"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {tender.statusCode !== "DRAFT" && (
                                  <Link href={`/publisher/tenders/${tender.id}/analytics`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-gray-100"
                                      aria-label="View analytics"
                                    >
                                      <TrendingUp className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete tender"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenders found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery || statusFilter !== "all" 
                        ? "Try adjusting your search or filter criteria"
                        : "Get started by creating your first tender"
                      }
                    </p>
                    {!searchQuery && statusFilter === "all" && (
                      <Link href="/publisher/tenders/new">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Tender
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

