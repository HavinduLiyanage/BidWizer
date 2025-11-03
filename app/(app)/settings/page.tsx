"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/lib/hooks/use-session";

export default function SettingsPage() {
  const { user, isLoading } = useUser();
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    tenderAlerts: true,
    weeklyDigest: false,
    marketingEmails: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to save settings
      console.log("Saving settings:", notifications);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 bg-slate-50">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Settings
          </h1>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailNotifications"
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        emailNotifications: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="emailNotifications" className="text-sm font-medium">
                    Email Notifications
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  Receive important updates and alerts via email
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tenderAlerts"
                    checked={notifications.tenderAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        tenderAlerts: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="tenderAlerts" className="text-sm font-medium">
                    Tender Alerts
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  Get notified about new tenders matching your criteria
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="weeklyDigest"
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        weeklyDigest: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="weeklyDigest" className="text-sm font-medium">
                    Weekly Digest
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  Receive a weekly summary of activity and opportunities
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketingEmails"
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        marketingEmails: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="marketingEmails" className="text-sm font-medium">
                    Marketing Emails
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  Receive updates about new features and promotional offers
                </p>
              </div>

              <div className="pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Data Export</h3>
                  <p className="text-sm text-gray-500">Download your data</p>
                </div>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
