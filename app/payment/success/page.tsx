import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for your payment. Your transaction has been completed successfully.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
          <Link href="/tenders">
            <Button variant="outline" className="w-full">
              Browse Tenders
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          A confirmation email has been sent to your registered email address.
        </p>
      </Card>
    </div>
  );
}

