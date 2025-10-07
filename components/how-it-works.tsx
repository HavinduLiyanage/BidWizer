import { Upload, Search, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  {
    icon: Upload,
    label: 'STEP 1',
    title: 'PUBLISH TENDERS',
    description: 'Organizations and government entities post tenders with detailed requirements and deadlines.',
    link: 'Explore →'
  },
  {
    icon: Search,
    label: 'STEP 2',
    title: 'DISCOVER OPPORTUNITIES',
    description: 'Bidders browse and search through thousands of verified tenders matching their expertise.',
    link: 'Explore →'
  },
  {
    icon: Sparkles,
    label: 'STEP 3',
    title: 'ACT SMARTER WITH AI',
    description: 'Use AI-powered tools to analyze requirements, draft responses, and submit winning bids.',
    link: 'Explore →'
  }
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1]
    }
  }
}

export default function HowItWorks() {
  return (
    <section className="bg-navy-900 py-20">
      <div className="container">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-widest text-white/60">PROCESS</p>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">HOW IT WORKS</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Three simple steps to transform your tendering experience
          </p>
        </motion.div>

        <motion.div 
          className="mt-12 grid gap-8 md:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, idx) => (
            <motion.div key={idx} className="relative" variants={item}>
              <motion.div 
                className="overflow-hidden rounded-xl bg-white p-8"
                whileHover={{ 
                  y: -8,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                  transition: { duration: 0.3 }
                }}
              >
                {/* Image placeholder */}
                <motion.div 
                  className="mb-6 flex aspect-video items-center justify-center rounded-lg bg-slate-100"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <step.icon className="h-12 w-12 text-slate-400" />
                </motion.div>

                {/* Content */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {step.label}
                  </p>
                  <h3 className="mt-2 text-lg font-bold uppercase text-navy-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                  <motion.button 
                    className="mt-4 text-sm font-semibold text-primary hover:text-primary-600"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {step.link}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

