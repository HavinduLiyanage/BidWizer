'use client'

import Link from 'next/link'
import { Play, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import { PLANS_ORDER, PLAN_SPECS, PlanTier, DEFAULT_TRIAL_DAYS } from '@/lib/entitlements'

const SIGNUP_PATH = '/register/bidder/step1'

const formatLkr = (amount?: number) => {
  if (amount == null) {
    return null
  }

  return `Rs ${amount.toLocaleString('en-LK')}`
}

const formatUsd = (amount?: number) => {
  if (amount == null) {
    return null
  }

  return `~$${amount}`
}

const getPlanCta = (id: PlanTier) => {
  if (id === 'ENTERPRISE') {
    return {
      label: 'Contact us',
      href: '/contact',
    }
  }

  return {
    label: id === 'FREE' ? 'Start free trial' : 'Get started',
    href: `${SIGNUP_PATH}?plan=${id}`,
  }
}

const planSpecs = PLANS_ORDER.map((id) => PLAN_SPECS[id])

const faqs = [
  {
    question: 'Can I try before making a commitment?',
    answer: `Absolutely! Enjoy a ${DEFAULT_TRIAL_DAYS}-day free trial on our Freemium plan. No credit card required, and you can upgrade, downgrade, or cancel anytime.`,
  },
  {
    question: 'Do you support LKR as a billing currency?',
    answer: 'Yes, we accept payments in both USD and LKR. Pricing will be automatically converted using the current exchange rate at the time of purchase.',
  },
  {
    question: 'Can I change my plan later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate any charges or credits to your account.',
  },
  {
    question: 'Is my data safe?',
    answer: 'Yes, we take data security very seriously. All data is encrypted in transit and at rest. We are compliant with industry security standards and conduct regular security audits.',
  },
  {
    question: 'What kind of AI tools is provided?',
    answer: 'Our AI tools include document summarization, question answering with citations, compliance checking, bid writing assistance, and competitive analysis powered by advanced language models.',
  },
]

export default function PricingPage() {
  const ctaFree = getPlanCta('FREE')
  const visiblePlans = planSpecs.filter((plan) => plan.priceLKR != null)

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
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
        <section className="bg-white py-20">
          <div className="container">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 md:text-4xl">
                Flexible plans for every bidding team
              </h2>
              <p className="mt-4 text-slate-600">
                Choose the plan that fits your tendering needs
              </p>
            </motion.div>

            {/* Pricing Cards */}
            <div className="mt-12 mx-auto grid max-w-6xl gap-8 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {visiblePlans.map((plan, idx) => {
                const cta = getPlanCta(plan.id)
                const priceLkr = formatLkr(plan.priceLKR)
                const priceUsd = formatUsd(plan.priceUSD)

                return (
                  <motion.div
                    key={plan.id}
                    className={`relative flex h-full flex-col rounded-2xl bg-white p-8 shadow-sm transition-shadow ${
                      plan.isPopular ? 'ring-2 ring-primary' : 'ring-1 ring-slate-200'
                    }`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    whileHover={{
                      y: -8,
                      boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                      transition: { duration: 0.3 },
                    }}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                        {plan.label}
                      </h3>
                      {plan.highlight && (
                        <p className="mt-2 text-sm text-primary/80">{plan.highlight}</p>
                      )}
                      <div className="mt-4 flex flex-col items-center gap-1">
                        {priceLkr ? (
                          <>
                            <span className="text-4xl font-bold text-navy-900">{priceLkr}</span>
                            <span className="text-xs uppercase tracking-widest text-slate-500">
                              per month
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-semibold text-navy-900">Custom pricing</span>
                        )}
                        {priceUsd && (
                          <span className="text-sm text-slate-500">{priceUsd}</span>
                        )}
                        {plan.trialDays && (
                          <span className="text-xs text-slate-500">
                            {plan.trialDays}-day free trial
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1 text-left">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <motion.div className="mt-8" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link
                        href={cta.href}
                        className={`btn w-full ${
                          plan.isPopular
                            ? 'btn-primary'
                            : 'border border-slate-300 bg-white text-navy-900 hover:bg-slate-50'
                        }`}
                      >
                        {cta.label}
                      </Link>
                    </motion.div>
                  </motion.div>
                )
              })}
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
              <motion.div className="mt-6" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
              <motion.div className="mt-8" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href={ctaFree.href} className="btn btn-primary">
                  {ctaFree.label}
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
