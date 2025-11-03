import { Quote } from 'lucide-react'
import { motion } from 'framer-motion'

const stories = [
  {
    logo: 'Webflow',
    quote: 'BIDWIZER REDUCED OUR TENDER REVIEW TIME BY 75%',
    description: 'The AI-powered analysis helped us identify key requirements instantly and focus on crafting winning proposals.',
    author: 'Samantha Fernando',
    role: 'CEO, Oceanic Builders'
  },
  {
    logo: 'Rakuten',
    quote: 'THE AI TOOLS ARE A GAME-CHANGER FOR OUR EFFICIENCY',
    description: 'We can now handle 3x more tender opportunities with the same team size, thanks to intelligent automation.',
    author: 'Ranjan Kumar',
    role: 'Director of IT, TechFlow Lanka'
  },
  {
    logo: 'Webflow',
    quote: 'STREAMLINED OUR ENTIRE TENDERING OPERATION WITH INCREDIBLE EFFICIENCY',
    description: 'From discovery to submission, BidWizer has transformed how we approach government contracts.',
    author: 'Michael Perera',
    role: 'Procurement Manager, BuildRight Constructions'
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
  hidden: { opacity: 0, y: 40 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1]
    }
  }
}

export default function CustomerStories() {
  return (
    <section className="bg-blue-50 py-20">
      <div className="container">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-widest text-slate-500">TESTIMONIALS</p>
          <h2 className="mt-2 text-3xl font-bold text-navy-900 md:text-4xl">
            CUSTOMER STORIES
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Hear what our clients say about how BidWizer is transforming their tendering process
          </p>
        </motion.div>

        <motion.div 
          className="mt-12 grid gap-8 md:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {stories.map((story, idx) => (
            <motion.div 
              key={idx} 
              className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5"
              variants={item}
              whileHover={{ 
                y: -8,
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                transition: { duration: 0.3 }
              }}
            >
              {/* Logo */}
              <motion.div 
                className="mb-6 flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
                <span className="font-bold text-navy-900">{story.logo}</span>
              </motion.div>

              {/* Quote */}
              <div className="mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: 0.3 + idx * 0.1,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  <Quote className="mb-2 h-6 w-6 text-primary" />
                </motion.div>
                <h3 className="text-sm font-bold uppercase leading-tight text-navy-900">
                  {story.quote}
                </h3>
              </div>

              {/* Description */}
              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                {story.description}
              </p>

              {/* Author */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-navy-900">{story.author}</p>
                <p className="text-xs text-slate-500">{story.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

