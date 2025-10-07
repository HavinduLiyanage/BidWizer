import Link from "next/link";
import { Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/entitlements";
import { formatPriceWithConversion } from "@/lib/fx";

export default function BillingPage() {
  const currentPlan = PLANS.Team;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Plan & Billing
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {currentPlan.name}
                  </h3>
                  <p className="text-3xl font-bold text-primary mt-2">
                    ${currentPlan.price}
                    <span className="text-base font-normal text-gray-600">
                      /month
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatPriceWithConversion(currentPlan.price)}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {currentPlan.monthlyAIQuestions} AI questions/month
                    </span>
                  </div>
                </div>

                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    Upgrade Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-gray-500">No billing history available yet</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

