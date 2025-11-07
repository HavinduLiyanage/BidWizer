'use client'

import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import Link from 'next/link'
import { ArrowRight, Zap, Search, Users, BarChart3, MessageSquare, Sparkles, Target } from 'lucide-react'
import { motion, type TargetAndTransition, type Variants } from 'framer-motion'

const coreFeatures = [
  {
    icon: Search,
    title: 'Smart Discovery',
    description: 'AI-powered tender matching with intelligent filtering and recommendations.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Zap,
    title: 'AI Analysis',
    description: 'Instant document summarization and intelligent Q&A with source citations.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Real-time collaboration tools for seamless bid preparation and management.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Comprehensive dashboards with performance tracking and market intelligence.',
    color: 'from-orange-500 to-red-500'
  }
]

const aiCapabilities = [
  {
    icon: MessageSquare,
    title: 'Document Q&A',
    description: 'Ask questions about tender documents and get precise answers with citations.',
    highlight: 'Natural Language Processing'
  },
  {
    icon: Sparkles,
    title: 'Bid Optimization',
    description: 'AI-powered suggestions to improve bid quality and increase win probability.',
    highlight: 'Machine Learning'
  },
  {
    icon: Target,
    title: 'Market Intelligence',
    description: 'Stay ahead with AI-driven insights and competitive analysis.',
    highlight: 'Predictive Analytics'
  }
]

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

const item: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8
    }
  }
}

const floatingAnimation: TargetAndTransition = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity
  }
}

export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-navy-900 -mt-20 pt-20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
          
          {/* Animated background elements */}
          <motion.div 
            className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl"
            animate={floatingAnimation}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-xl"
            animate={{
              ...floatingAnimation,
              transition: {
                ...floatingAnimation.transition,
                delay: 1.5,
              },
            }}
          />
          
          <div className="container relative z-10 py-20 text-center md:py-28">
            <motion.h1 
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              POWERFUL FEATURES<br />
              FOR MODERN TENDERING
            </motion.h1>

            <motion.p 
              className="mt-4 max-w-2xl mx-auto text-white/70"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Transform your tendering process with AI-powered intelligence, 
              smart collaboration, and comprehensive analytics.
            </motion.p>

            <motion.div 
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/pricing" className="btn btn-primary text-base">
                  View Pricing <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="py-20 bg-white relative overflow-hidden">
          <div className="container">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-widest text-slate-500">CORE FEATURES</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 md:text-4xl">
                Everything You Need to Succeed
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Powerful tools designed to streamline your tendering process from discovery to submission.
              </p>
            </motion.div>

            <motion.div 
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {coreFeatures.map((feature, idx) => (
                <motion.div 
                  key={idx} 
                  className="group relative"
                  variants={item}
                  whileHover={{ y: -10, scale: 1.02 }}
                >
                  <div className="relative rounded-2xl bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg border border-slate-200/50 overflow-hidden">
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    {/* Animated icon */}
                    <motion.div 
                      className="relative z-10 mb-6"
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                        <feature.icon className="h-8 w-8" />
                      </div>
                    </motion.div>
                    
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-navy-900 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* AI Capabilities Section */}
        <section className="py-20 bg-gradient-to-br from-navy-900 via-navy-800 to-purple-900 relative overflow-hidden">
          {/* Animated background */}
          <motion.div 
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <div className="container relative z-10">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-widest text-white/60">AI POWERED</p>
              <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Intelligent Capabilities
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-white/70">
                Advanced AI that understands, analyzes, and optimizes your tendering process.
              </p>
            </motion.div>

            <motion.div 
              className="grid gap-8 md:grid-cols-3"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {aiCapabilities.map((capability, idx) => (
                <motion.div 
                  key={idx} 
                  className="group relative"
                  variants={item}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <div className="relative rounded-2xl bg-white/10 backdrop-blur-lg p-8 border border-white/20 overflow-hidden">
                    {/* Glowing effect */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      animate={{ opacity: [0, 0.1, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.5 }}
                    />
                    
                    <motion.div 
                      className="relative z-10 mb-6"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-500 text-white shadow-lg">
                        <capability.icon className="h-8 w-8" />
                      </div>
                    </motion.div>
                    
                    <div className="relative z-10">
                      <div className="mb-2">
                        <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                          {capability.highlight}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">
                        {capability.title}
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        {capability.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20 relative overflow-hidden">
          <motion.div 
            className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl"
            animate={floatingAnimation}
          />
          <motion.div 
            className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"
            animate={{
              ...floatingAnimation,
              transition: {
                ...floatingAnimation.transition,
                delay: 2,
              },
            }}
          />
          
          <div className="container text-center relative z-10">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 md:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              READY TO GET STARTED?
            </motion.h2>
            
            <motion.p 
              className="mx-auto mt-4 max-w-2xl text-slate-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Join thousands of businesses transforming their tendering process with BidWizer
            </motion.p>
            
            <motion.div 
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/pricing" className="btn btn-primary text-base">
                  View Pricing <ArrowRight className="h-4 w-4" />
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
