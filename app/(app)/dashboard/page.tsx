import Link from "next/link";
import { Calendar, Building2, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockTenders, mockPublishers } from "@/lib/mock-data";
import { useUser } from "@/lib/hooks/use-session";

export default function DashboardPage() {
  const { user, isLoading } = useUser();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {isLoading ? "..." : user?.name || "User"}
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your tenders today
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
                    <img
                      src={publisher.logo}
                      alt={publisher.name}
                      className="w-12 h-12 rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {publisher.name}
                      </h3>
                      <Button variant="link" className="p-0 h-auto text-sm">
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
                      {mockTenders.map((tender) => (
                        <tr key={tender.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/tenders/${tender.id}`}
                              className="font-medium text-gray-900 hover:text-primary"
                            >
                              {tender.title}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={tender.publisher.logo}
                                alt={tender.publisher.name}
                                className="w-8 h-8 rounded"
                              />
                              <span className="text-sm text-gray-700">
                                {tender.publisher.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline">{tender.category}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(tender.deadline).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="success">Active</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/tenders/${tender.id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
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

