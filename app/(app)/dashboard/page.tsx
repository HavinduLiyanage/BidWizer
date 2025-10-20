import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { Calendar, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { mockPublishers } from "@/lib/mock-data";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TenderStatus } from "@prisma/client";

function getStatusBadgeVariant(status: TenderStatus): BadgeProps["variant"] {
  switch (status) {
    case "PUBLISHED":
    case "AWARDED":
      return "success";
    case "DRAFT":
      return "warning";
    case "CANCELLED":
      return "destructive";
    case "CLOSED":
      return "secondary";
    default:
      return "outline";
  }
}

function formatStatusLabel(status: TenderStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(date: Date | null | undefined): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  let organizationId = session.user.organizationId;

  if (!organizationId) {
    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        organizationId: true,
      },
    });

    organizationId = membership?.organizationId ?? null;
  }

  const tenders = organizationId
    ? await db.tender.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: { name: true },
          },
        },
      })
    : [];

  const displayName = session.user?.name ?? session.user?.email ?? "User";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {displayName}
            </h1>
            <p className="text-gray-600">
              Here&apos;s what&apos;s happening with your tenders today
            </p>
          </div>

          {/* Publishers You Follow */}
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Publishers You Follow</h2>
              <Button variant="outline" size="sm">
                Follow new publisher
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockPublishers.map((publisher) => (
                <Card key={publisher.id}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <Image
                      src={publisher.logo}
                      alt={publisher.name}
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {publisher.name}
                      </h3>
                      <Button variant="ghost" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800">
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Recent Tenders */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Recent Tenders</h2>
              <Link href="/tenders">
                <Button variant="outline" size="sm">
                  View All
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Publisher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deadline
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenders.length === 0 ? (
                        <tr>
                          <td
                            className="px-6 py-12 text-center text-sm text-gray-500"
                            colSpan={6}
                          >
                            You haven&apos;t posted any tenders yet. Create one to see it appear
                            here.
                          </td>
                        </tr>
                      ) : (
                        tenders.map((tender) => (
                          <tr key={tender.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <Link
                                href={`/tenders/${tender.id}/workspace`}
                                className="font-medium text-gray-900 hover:text-primary"
                              >
                                {tender.title}
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-700">
                                {tender.organization?.name ?? "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline">
                                {tender.category ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(tender.deadline)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={getStatusBadgeVariant(tender.status)}>
                                {formatStatusLabel(tender.status)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Link href={`/tenders/${tender.id}/workspace`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
