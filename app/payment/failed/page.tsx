import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <XCircle className="h-12 w-12 text-error" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-8">
          We couldn&apos;t process your payment. Please check your payment details and try again.
        </p>

        <div className="space-y-3">
          <Link href="/pricing">
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          If the problem persists, please contact our support team.
        </p>
      </Card>
    </div>
  );
}

