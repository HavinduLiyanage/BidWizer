import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <PageHero
        title="Terms of Service"
        description="Last updated: October 4, 2024"
      />

      <main className="flex-1 py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing and using BidWizer ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Use License
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Permission is granted to temporarily access the materials (information or software) on BidWizer for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on BidWizer</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Account Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are responsible for maintaining the security of your account and password. BidWizer cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are responsible for all content posted and activity that occurs under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Payment Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                A valid payment method is required to process the payment for your subscription. You shall provide BidWizer with accurate and complete billing information including full name, address, state, zip code, telephone number, and valid payment method information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Cancellation and Termination
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are solely responsible for properly canceling your account. You can cancel your account at any time by contacting our support team. All of your content will be immediately deleted from the Service upon cancellation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Modifications to Service
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                BidWizer reserves the right at any time to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. BidWizer shall not be liable to you or to any third party for any modification, price change, suspension, or discontinuance of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Contact Information
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Questions about the Terms of Service should be sent to us at{" "}
                <a href="mailto:legal@bidwizer.com" className="text-primary hover:underline">
                  legal@bidwizer.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

