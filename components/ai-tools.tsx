import { Zap, MessageSquare, Users, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

const tools = [
  {
    icon: Zap,
    label: 'FEATURE',
    title: 'SUMMARIZE IN SECONDS',
    description: 'Get instant AI summaries of lengthy tender documents with key requirements and deadlines.',
    link: 'Explore →'
  },
  {
    icon: MessageSquare,
    label: 'FEATURE',
    title: 'ASK QUESTIONS WITH CITATIONS',
    description: 'Ask specific questions about tender documents and receive answers with source citations.',
    link: 'Explore →'
  },
  {
    icon: Users,
    label: 'FEATURE',
    title: 'COLLABORATE WITH YOUR TEAM',
    description: 'Share insights, assign tasks, and work together on bid responses in real-time.',
    link: 'Explore →'
  },
  {
    icon: TrendingUp,
    label: 'FEATURE',
    title: 'EXPORT WITH CONFIDENCE',
    description: 'Generate professional bid documents with AI-enhanced content ready for submission.',
    link: 'Explore →'
  }
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1]
    }
  }
}

export default function AITools() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="container">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-widest text-slate-500">AI TOOLS</p>
          <h2 className="mt-2 text-3xl font-bold text-navy-900 md:text-4xl">
            AI TOOLS THAT MAKE BIDDING SMARTER
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Powerful features designed for an efficient and winning bidding process
          </p>
        </motion.div>

        <motion.div 
          className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {tools.map((tool, idx) => (
            <motion.div 
              key={idx} 
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
              variants={item}
              whileHover={{ 
                y: -8,
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                transition: { duration: 0.3 }
              }}
            >
              {/* Image placeholder */}
              <motion.div 
                className="mb-6 flex aspect-video items-center justify-center rounded-lg bg-slate-100"
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "rgba(59, 130, 246, 0.1)"
                }}
                transition={{ duration: 0.3 }}
              >
                <tool.icon className="h-10 w-10 text-slate-400" />
              </motion.div>

              {/* Content */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {tool.label}
                </p>
                <h3 className="mt-2 text-base font-bold uppercase leading-tight text-navy-900">
                  {tool.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {tool.description}
                </p>
                <motion.button 
                  className="mt-3 text-sm font-semibold text-primary hover:text-primary-600"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {tool.link}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

