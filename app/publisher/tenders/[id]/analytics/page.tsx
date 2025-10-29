"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Eye, Download, MessageSquare } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAnalytics } from "@/lib/mock-data";

interface Tender {
  id: string;
  title: string;
  description: string;
  category: string;
}

export default function TenderAnalyticsPage({ params }: { params: { id: string } }) {
  const [period, setPeriod] = useState<"7days" | "30days">("7days");
  const [tender, setTender] = useState<Tender | null>(null);
  const analytics = mockAnalytics;

  useEffect(() => {
    async function fetchTender() {
      try {
        const response = await fetch(`/api/tenders/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setTender(data);
        }
      } catch (error) {
        console.error("Failed to fetch tender:", error);
      }
    }
    
    fetchTender();
  }, [params.id]);

  const kpis = [
    {
      title: "Total Views",
      value: analytics.views.value,
      change: analytics.views.change,
      icon: Eye,
    },
    {
      title: "Unique Visitors",
      value: analytics.visitors.value,
      change: analytics.visitors.change,
      icon: TrendingUp,
    },
    {
      title: "Document Downloads",
      value: analytics.downloads.value,
      change: analytics.downloads.change,
      icon: Download,
    },
    {
      title: "AI Questions Asked",
      value: analytics.questions.value,
      change: analytics.questions.change,
      icon: MessageSquare,
    },
  ];

  const activities = [
    { user: "User A", action: "viewed tender", time: "2 hours ago" },
    { user: "User B", action: "downloaded Technical_Requirements.pdf", time: "3 hours ago" },
    { user: "User C", action: "asked AI question", time: "5 hours ago" },
    { user: "User D", action: "viewed tender", time: "6 hours ago" },
    { user: "User E", action: "downloaded Tender_Brief.pdf", time: "8 hours ago" },
  ];

  return (
    <>
      <SiteHeader variant="page" />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {tender?.title || "Loading..."}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod("7days")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === "7days"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Last 7 days
              </button>
              <button
                onClick={() => setPeriod("30days")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === "30days"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Last 30 days
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpis.map((kpi) => (
              <Card key={kpi.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">
                      {kpi.title}
                    </p>
                    <kpi.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {kpi.value.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingUp
                      className={`h-4 w-4 ${
                        kpi.change >= 0 ? "text-success" : "text-error"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        kpi.change >= 0 ? "text-success" : "text-error"
                      }`}
                    >
                      {kpi.change > 0 ? "+" : ""}
                      {kpi.change}%
                    </span>
                    <span className="text-sm text-gray-500">
                      vs previous period
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {activity.user.charAt(activity.user.length - 1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900">
                        <span className="font-medium">{activity.user}</span>{" "}
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

