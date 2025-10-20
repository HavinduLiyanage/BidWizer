"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle password reset logic
    console.log("Password reset requested for:", email);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <Link href="/" className="text-2xl font-bold text-primary">
            BidWizer
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Forgot Password?
        </h1>
        <p className="text-gray-600 mb-8">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {sent ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a password reset link to {email}
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Log In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-primary hover:underline"
              >
                Back to Log In
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

