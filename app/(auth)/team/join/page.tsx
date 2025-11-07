"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Mail, User } from "lucide-react";

interface InviteDetails {
  email: string;
  name?: string | null;
  position?: string | null;
  organizationName: string;
  inviterName: string;
  token: string;
}

export default function JoinTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("This invite link is invalid. Please contact your administrator.");
      setIsLoading(false);
      return;
    }

    const inviteToken = tokenParam;

    async function loadInvite(currentToken: string) {
      try {
        const response = await fetch(`/api/invitations/${currentToken}`);
        const payload = await response.json();

        if (!response.ok) {
          setError(payload?.error ?? "Unable to load invitation details.");
          return;
        }

        const data = payload.invitation as {
          email: string;
          name?: string | null;
          position?: string | null;
          organizationName: string;
          inviterName: string;
        };

        setInvite({
          email: data.email,
          name: data.name,
          position: data.position,
          organizationName: data.organizationName,
          inviterName: data.inviterName,
          token: currentToken,
        });
        setError(null);
      } catch (err) {
        console.error("Failed to fetch invitation:", err);
        setError("Unable to load invitation details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvite(inviteToken);
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invite) return;

    setIsSubmitting(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/invitations/${invite.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Unable to complete registration. Please try again.");
        return;
      }

      const params = new URLSearchParams({
        email: invite.email,
        registered: "invite",
        lockEmail: "true",
      });
      router.push(`/login?${params.toString()}`);
    } catch (err) {
      console.error("Invitation acceptance failed:", err);
      setError("Unexpected error completing registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <SiteHeader variant="page" />
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center text-gray-600">Loading your invitation…</div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (error && !invite) {
    return (
      <>
        <SiteHeader variant="page" />
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 space-y-4 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
              <h1 className="text-xl font-semibold text-gray-900">Invitation unavailable</h1>
              <p className="text-sm text-gray-600">{error}</p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Go to login
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="page" />
      <main className="min-h-screen bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-xl">
          <Card className="shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-gray-900">Join your team on BidWizer</h1>
                <p className="text-gray-600">
                  {invite?.inviterName} invited you to collaborate with {invite?.organizationName}.
                  Create your password to continue.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{invite?.name ?? "Team member"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{invite?.email}</span>
                </div>
                {invite?.position ? (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="h-4 w-4 text-gray-500">•</span>
                    <span>{invite.position}</span>
                  </div>
                ) : null}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">Minimum 8 characters.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Type your password again"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account…" : "Confirm & Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
