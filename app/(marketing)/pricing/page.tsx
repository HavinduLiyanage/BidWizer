'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

type Plan = {
  name: string
  price: number | string
  period: string
  features: string[]
  popular: boolean
}

const pricingPlans: Plan[] = [
  {
    name: 'Basic Plan',
    price: 20,
    period: '/month',
    features: [
      '3 Seats total → 1 Admin (CEO) + 2 team members',
      '120 AI Q&A interactions per month',
      'Full access to all tender documents',
      'Follow up to 5 publishers (email alerts)',
      'Standard support (email + in-app chat)',
      'Dashboard access with usage tracker',
      'Company profile management'
    ],
    popular: false
  },
  {
    name: 'Team Plan',
    price: 35,
    period: '/month',
    features: [
      '5 Seats total → 1 Admin (CEO) + 4 team members',
      '300 AI Q&A interactions per month',
      'Full access to all tender documents',
      'Follow up to 15 publishers (email alerts)',
      'Priority support (24-hour response)',
      'Advanced dashboard with AI usage bar',
      'Billing section & plan management'
    ],
    popular: true // this is your “Most popular” plan
  },
  {
    name: 'Enterprise / Custom',
    price: 'Contact for pricing',
    period: '',
    features: [
      'Custom seat allocations',
      'Higher AI usage limits & dedicated support',
      'Advanced analytics & team reporting',
      'Private tender hosting or integrations',
      'Custom onboarding & training'
    ],
    popular: false
  }
];

const faqs = [
  {
    question: 'Can I try before making a commitment?',
    answer: 'Absolutely! We offer a 14-day free trial on all our paid plans. No credit card required, and you can upgrade, downgrade, or cancel anytime.'
  },
  {
    question: 'Do you support LKR as a billing currency?',
    answer: 'Yes, we accept payments in both USD and LKR. Pricing will be automatically converted using the current exchange rate at the time of purchase.'
  },
  {
    question: 'Can I change my plan later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate any charges or credits to your account.'
  },
  {
    question: 'Is my data safe?',
    answer: 'Yes, we take data security very seriously. All data is encrypted in transit and at rest. We are compliant with industry security standards and conduct regular security audits.'
  },
  {
    question: 'What kind of AI tools is provided?',
    answer: 'Our AI tools include document summarization, question answering with citations, compliance checking, bid writing assistance, and competitive analysis powered by advanced language models.'
  }
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <>
      <SiteHeader />
      <main>
        {/* Video Section */}
        <section className="bg-white py-16 md:py-20">
          <div className="container">
            <motion.div
              className="mx-auto max-w-4xl text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold uppercase text-navy-900 md:text-4xl lg:text-5xl">
                SEE HOW BIDWIZER HELPS YOU WIN MORE TENDERS
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-slate-600">
                Discover opportunities, streamline bidding, and win more tenders with AI-powered insights.
                Watch our demo to see how teams are transforming their tendering process.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button className="btn btn-primary mt-6">Explore with plan</button>
              </motion.div>

              {/* Video Player */}
              <motion.div
                className="mt-12 aspect-video overflow-hidden rounded-2xl bg-slate-200"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="flex h-full items-center justify-center">
                  <button className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110">
                    <Play className="ml-1 h-8 w-8 text-primary" fill="currentColor" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-blue-50 py-20">
          <div className="container">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Pricing
              </p>
              <h2 className="mt-2 text-3xl font-bold uppercase text-navy-900 md:text-4xl">
                SIMPLE, TRANSPARENT PRICING FOR SRI LANKAN BUSINESSES
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Choose the plan that fits your tendering needs
              </p>

              {/* Billing Toggle */}
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white p-1 shadow-sm">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                    billingPeriod === 'monthly'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                    billingPeriod === 'yearly'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </motion.div>

            {/* Pricing Cards */}
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {pricingPlans.map((plan, idx) => (
                <motion.div
                  key={plan.name}
                  className={`relative rounded-2xl bg-white p-8 shadow-sm ${
                    plan.popular ? 'ring-2 ring-primary' : 'ring-1 ring-slate-200'
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  whileHover={{
                    y: -8,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    transition: { duration: 0.3 }
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      {plan.name}
                    </h3>

                    {/* --- FIXED PRICE RENDERING --- */}
                    <div className="mt-4">
                      {typeof plan.price === 'number' ? (
                        <>
                          <span className="text-5xl font-bold text-navy-900">
                            ${plan.price}
                          </span>
                          <span className="text-slate-600">{plan.period}</span>
                        </>
                      ) : (
                        <span className="text-xl font-semibold text-navy-900">
                          {plan.price}
                        </span>
                      )}
                    </div>
                    {/* --- END FIX --- */}
                  </div>

                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.div
                    className="mt-8"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href={
                        plan.name.toLowerCase().includes('enterprise')
                          ? '/contact'
                          : `/register/bidder/step1?plan=${encodeURIComponent(plan.name)}`
                      }
                      className={`btn w-full ${
                        plan.popular
                          ? 'btn-primary'
                          : 'border border-slate-300 bg-white text-navy-900 hover:bg-slate-50'
                      }`}
                    >
                      {plan.name.toLowerCase().includes('enterprise') ? 'Contact us' : 'Get started'}
                    </Link>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Logo Strip */}
        <section className="border-y border-slate-200 bg-white py-12">
          <div className="container">
            <p className="mb-8 text-center text-xs uppercase tracking-widest text-slate-500">
              Trusted by leading businesses in Sri Lanka
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              {['Webflow', 'Relume', 'Webflow', 'Relume', 'Webflow', 'Relume'].map((logo, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                  </svg>
                  <span className="font-bold text-navy-900">{logo}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial CTA */}
        <section className="bg-slate-50 py-16">
          <div className="container">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 flex justify-center">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold uppercase text-navy-900 md:text-3xl">
                BIDWIZER CUT OUR TENDER REVIEW TIME BY 70%. WE NEVER MISS DEADLINES NOW.
              </h3>
              <div className="mt-6">
                <p className="font-semibold text-navy-900">Samantha Fernando</p>
                <p className="text-sm text-slate-600">Product Lead / Strategic Solutions</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-white py-20">
          <div className="container">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold uppercase text-navy-900 md:text-4xl">FAQS</h2>
              <p className="mt-3 text-slate-600">
                Common questions about our tender platform and how we can help grow your business
              </p>
            </motion.div>

            <div className="mx-auto mt-12 max-w-3xl space-y-6">
              {faqs.map((faq, idx) => (
                <motion.div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                >
                  <h3 className="text-lg font-semibold text-navy-900">{faq.question}</h3>
                  <p className="mt-2 text-slate-600">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="bg-slate-50 py-16">
          <div className="container">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-bold uppercase text-navy-900 md:text-3xl">
                STILL HAVE QUESTIONS?
              </h2>
              <p className="mt-3 text-slate-600">
                Our support team is always on hand to help you get started
              </p>
              <motion.div
                className="mt-6"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/contact" className="btn btn-primary">
                  Contact us
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-navy-900 py-20">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold uppercase text-white md:text-4xl">
                READY TO SIMPLIFY YOUR TENDERING PROCESS?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/80">
                Start using our tender management platform and see why hundreds of businesses trust BidWizer
              </p>
              <motion.div
                className="mt-8"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/register/bidder/step1" className="btn btn-primary">
                  Start free account
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
