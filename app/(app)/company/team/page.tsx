"use client";

import { useState } from "react";
import { UserPlus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockTeamMembers } from "@/lib/mock-data";

export default function TeamManagementPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const totalSeats = 5;
  const usedSeats = mockTeamMembers.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Team Members
              </h1>
              <p className="text-gray-600">
                {usedSeats}/{totalSeats} seats used
              </p>
            </div>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockTeamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {member.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {member.position}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={member.role === "Owner" ? "default" : "outline"}>
                            {member.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              member.status === "Active"
                                ? "success"
                                : member.status === "Pending"
                                ? "warning"
                                : "outline"
                            }
                          >
                            {member.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-gray-400 hover:text-gray-600"
                              aria-label="Edit member"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {member.role !== "Owner" && (
                              <button
                                className="text-gray-400 hover:text-red-600"
                                aria-label="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

