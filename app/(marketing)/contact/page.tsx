'use client'

import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageCircle, 
  Headphones,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get detailed help via email',
    contact: 'support@bidwizer.com',
    responseTime: 'Within 24 hours',
    color: 'text-blue-600'
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Speak directly with our team',
    contact: '+1 (555) 123-4567',
    responseTime: 'Mon-Fri, 9AM-6PM EST',
    color: 'text-green-600'
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Instant help when you need it',
    contact: 'Available 24/7',
    responseTime: 'Immediate response',
    color: 'text-purple-600'
  },
  {
    icon: MapPin,
    title: 'Office Address',
    description: 'Visit us in person',
    contact: '123 Business Ave, Suite 100\nNew York, NY 10001',
    responseTime: 'By appointment',
    color: 'text-orange-600'
  }
]

const supportTopics = [
  'Account & Billing',
  'Technical Issues',
  'Tender Management',
  'AI Assistant Help',
  'Feature Requests',
  'Partnership Inquiries',
  'General Questions'
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    topic: '',
    priority: 'medium',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setSubmitStatus('success')
    setIsSubmitting(false)
    
    // Reset form after success
    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        company: '',
        topic: '',
        priority: 'medium',
        message: ''
      })
      setSubmitStatus('idle')
    }, 3000)
  }

  return (
    <>
      <SiteHeader variant="page" />
      
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Hero Section */}
        <section className="bg-navy-900 py-20">
          <div className="container text-center">
            <motion.h1 
              className="text-4xl font-bold text-white md:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Get in Touch
            </motion.h1>
            <motion.p 
              className="mx-auto mt-4 max-w-2xl text-xl text-blue-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              We&apos;re here to help you succeed. Reach out to our support team for any questions or assistance.
            </motion.p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16">
          <div className="container">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Multiple Ways to Reach Us
            </motion.h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {contactMethods.map((method, index) => (
                <motion.div 
                  key={method.title}
                  className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <div className={`${method.color} mb-4`}>
                    <method.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-navy-900 mb-2">{method.title}</h3>
                  <p className="text-sm text-slate-600 mb-3">{method.description}</p>
                  <div className="text-sm font-medium text-navy-900 mb-2">
                    {method.contact.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {method.responseTime}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-12 lg:grid-cols-2">
                {/* Form */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="text-3xl font-bold text-navy-900 mb-6">Send us a Message</h2>
                  <p className="text-slate-600 mb-8">
                    Fill out the form below and we&apos;ll get back to you as soon as possible. 
                    For urgent issues, please call us directly.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-navy-900 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Your full name"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-navy-900 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Your company name"
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-navy-900 mb-2">
                          Topic *
                        </label>
                        <select
                          id="topic"
                          name="topic"
                          required
                          value={formData.topic}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Select a topic</option>
                          {supportTopics.map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-navy-900 mb-2">
                          Priority
                        </label>
                        <select
                          id="priority"
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-navy-900 mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Please describe your question or issue in detail..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-primary px-8 py-4 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </button>

                    {submitStatus === 'success' && (
                      <motion.div 
                        className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Message sent successfully! We&apos;ll get back to you soon.</span>
                      </motion.div>
                    )}

                    {submitStatus === 'error' && (
                      <motion.div 
                        className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Something went wrong. Please try again.</span>
                      </motion.div>
                    )}
                  </form>
                </motion.div>

                {/* Info Panel */}
                <motion.div
                  className="space-y-8"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="rounded-lg bg-primary/5 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Headphones className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-semibold text-navy-900">Support Hours</h3>
                    </div>
                    <div className="space-y-2 text-slate-600">
                      <div className="flex justify-between">
                        <span>Monday - Friday:</span>
                        <span className="font-medium">9:00 AM - 6:00 PM EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturday:</span>
                        <span className="font-medium">10:00 AM - 4:00 PM EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sunday:</span>
                        <span className="font-medium">Closed</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Emergency Support:</strong> Available 24/7 for critical issues affecting your business operations.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-6">
                    <h3 className="text-xl font-semibold text-navy-900 mb-4">What to Include</h3>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Detailed description of your issue or question</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Steps you&apos;ve already tried to resolve the issue</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Browser and device information if it&apos;s a technical issue</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Screenshots or error messages if applicable</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-gradient-to-br from-primary/10 to-blue-100 p-6">
                    <h3 className="text-xl font-semibold text-navy-900 mb-4">Quick Response Times</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Live Chat:</span>
                        <span className="font-medium text-navy-900">Immediate</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Phone Support:</span>
                        <span className="font-medium text-navy-900">Within 5 minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Email Support:</span>
                        <span className="font-medium text-navy-900">Within 24 hours</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ CTA */}
        <section className="py-16">
          <div className="container text-center">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Looking for quick answers?
            </motion.h2>
            <motion.p 
              className="text-xl text-slate-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Check out our comprehensive help center with FAQs and guides
            </motion.p>
            <motion.a
              href="/help"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-white font-semibold hover:bg-primary-600 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Visit Help Center
            </motion.a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
