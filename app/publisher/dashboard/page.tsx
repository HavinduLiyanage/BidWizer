"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye, Edit, TrendingUp, Trash2, Search, Filter, Calendar, DollarSign, Users } from "lucide-react";
import { motion } from "framer-motion";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { mockTenders } from "@/lib/mock-data";

export default function PublisherDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // In real app, filter tenders by current publisher
  // For demo, we'll add some draft tenders to show the functionality
  const publisherTenders = [
    ...mockTenders,
    {
      id: "TND-2024-006",
      title: "School Renovation Project - Phase 1",
      publisher: mockTenders[0].publisher,
      category: "Construction",
      deadline: "2025-01-15",
      status: "Draft" as const,
      description: "Renovation of primary school buildings including classrooms, library, and administrative offices.",
      publishedDate: "2024-12-01",
      budget: "$500,000 - $750,000",
      type: "Public" as const,
      location: "Matara, Sri Lanka"
    },
    {
      id: "TND-2024-007",
      title: "Digital Transformation Initiative",
      publisher: mockTenders[0].publisher,
      category: "IT & Technology",
      deadline: "2025-02-01",
      status: "Draft" as const,
      description: "Implementation of digital systems for government services including website development and mobile app.",
      publishedDate: "2024-12-05",
      budget: "$1,200,000",
      type: "Public" as const,
      location: "Colombo, Sri Lanka"
    }
  ];

  // Filter tenders based on search and status
  const filteredTenders = publisherTenders.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tender.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: publisherTenders.length,
    active: publisherTenders.filter(t => t.status === "Active").length,
    draft: publisherTenders.filter(t => t.status === "Draft").length,
    totalViews: publisherTenders.reduce((sum, t) => sum + (Math.floor(Math.random() * 1000) + 100), 0)
  };

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
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
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

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
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

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
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

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
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
                {filteredTenders.length > 0 ? (
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
                                  tender.status === "Active"
                                    ? "bg-green-50 text-green-700"
                                    : tender.status === "Draft"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-gray-50 text-gray-700"
                                } border-0`}
                              >
                                {tender.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {tender.status === "Draft" ? (
                                <span className="text-gray-400">Not published</span>
                              ) : (
                                new Date(tender.publishedDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {tender.status === "Draft" ? (
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
                              {tender.status === "Draft" ? (
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
                                {tender.status !== "Draft" && (
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
                                {tender.status !== "Draft" && (
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

