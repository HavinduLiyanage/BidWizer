"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState({
    newTenders: true,
    deadlineReminders: true,
    teamActivity: false,
    platformUpdates: true,
  });

  const handleSave = () => {
    console.log("Saving notification preferences:", notifications);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Email Notifications
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="newTenders"
                  checked={notifications.newTenders}
                  onCheckedChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      newTenders: checked as boolean,
                    })
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="newTenders"
                    className="text-base font-medium cursor-pointer"
                  >
                    New tenders from followed publishers
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Get notified when publishers you follow post new tenders
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="deadlineReminders"
                  checked={notifications.deadlineReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      deadlineReminders: checked as boolean,
                    })
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="deadlineReminders"
                    className="text-base font-medium cursor-pointer"
                  >
                    Tender deadline reminders
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Receive reminders before tender deadlines
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="teamActivity"
                  checked={notifications.teamActivity}
                  onCheckedChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      teamActivity: checked as boolean,
                    })
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="teamActivity"
                    className="text-base font-medium cursor-pointer"
                  >
                    Team activity
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Stay updated on your team members' activities
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="platformUpdates"
                  checked={notifications.platformUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      platformUpdates: checked as boolean,
                    })
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="platformUpdates"
                    className="text-base font-medium cursor-pointer"
                  >
                    Platform updates
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Get notified about new features and improvements
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSave}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

