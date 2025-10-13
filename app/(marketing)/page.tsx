'use client'

import SiteHeader from '@/components/site-header'
import Hero from '@/components/hero'
import HowItWorks from '@/components/how-it-works'
import AITools from '@/components/ai-tools'
import CustomerStories from '@/components/customer-stories'
import SiteFooter from '@/components/site-footer'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <AITools />
        <CustomerStories />
        
        {/* Final CTA */}
        <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20">
          <div className="container text-center">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 md:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              READY TO TRANSFORM THE WAY YOU BID
            </motion.h2>
            
            <motion.p 
              className="mx-auto mt-4 max-w-2xl text-slate-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Join over 10,000 businesses already using BidWizer to win more tenders today
            </motion.p>
            
            <motion.div 
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/pricing" className="btn btn-primary text-base">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Logo Strip */}
            <motion.div 
              className="mt-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Trusted by leading organizations
              </p>
              <motion.div 
                className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-60"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {['Webflow', 'Relume', 'Webflow', 'Relume', 'Webflow', 'Relume'].map((logo, idx) => (
                  <motion.div 
                    key={idx} 
                    className="flex items-center gap-2"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ 
                      scale: 1.1,
                      opacity: 1,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                    </svg>
                    <span className="font-bold text-navy-900">{logo}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
