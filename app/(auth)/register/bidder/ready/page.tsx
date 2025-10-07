import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";

export default function BidderRegistrationReady() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <Stepper currentStep={3} completedSteps={[1, 2, 3]} />

            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                YOUR ACCOUNT IS READY
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Welcome to BidWizer. Let's get you started.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">Go to Dashboard</Button>
                </Link>
                <Link href="/tenders" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Explore Tenders
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

