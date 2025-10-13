'use client'

import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  BookOpen, 
  FileText, 
  Video, 
  Download, 
  ExternalLink,
  ChevronRight,
  Clock,
  User,
  Building2,
  Settings,
  BarChart3,
  MessageSquare,
  Shield,
  Zap,
  Users,
  CreditCard
} from 'lucide-react'

const docCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    description: 'Learn the basics and set up your account',
    color: 'bg-blue-500',
    guides: [
      {
        title: 'Welcome to BidWizer',
        description: 'An overview of the platform and its key features',
        readTime: '5 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'Account Setup Guide',
        description: 'Step-by-step instructions for creating and configuring your account',
        readTime: '10 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'Choosing the Right Plan',
        description: 'Compare plans and features to find what works best for you',
        readTime: '8 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'First Steps After Registration',
        description: 'What to do immediately after creating your account',
        readTime: '6 min read',
        type: 'guide',
        difficulty: 'Beginner'
      }
    ]
  },
  {
    id: 'bidding',
    title: 'Bidding & Tenders',
    icon: FileText,
    description: 'Find, analyze, and submit winning bids',
    color: 'bg-green-500',
    guides: [
      {
        title: 'Finding the Right Tenders',
        description: 'Use search and filters to discover relevant opportunities',
        readTime: '12 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      },
      {
        title: 'Tender Analysis with AI',
        description: 'Leverage AI tools to understand complex tender requirements',
        readTime: '15 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      },
      {
        title: 'Writing Winning Proposals',
        description: 'Best practices for creating compelling tender submissions',
        readTime: '20 min read',
        type: 'guide',
        difficulty: 'Advanced'
      },
      {
        title: 'Following Publishers',
        description: 'Stay updated with your preferred tender publishers',
        readTime: '7 min read',
        type: 'guide',
        difficulty: 'Beginner'
      }
    ]
  },
  {
    id: 'publishing',
    title: 'Publishing Tenders',
    icon: Building2,
    description: 'Create and manage your tender opportunities',
    color: 'bg-purple-500',
    guides: [
      {
        title: 'Creating Your First Tender',
        description: 'Complete guide to publishing a tender on the platform',
        readTime: '18 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      },
      {
        title: 'Tender Analytics Dashboard',
        description: 'Understanding metrics and performance indicators',
        readTime: '14 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      },
      {
        title: 'Managing Tender Responses',
        description: 'How to review, evaluate, and communicate with bidders',
        readTime: '16 min read',
        type: 'guide',
        difficulty: 'Advanced'
      },
      {
        title: 'Document Management',
        description: 'Uploading and organizing tender documents effectively',
        readTime: '10 min read',
        type: 'guide',
        difficulty: 'Beginner'
      }
    ]
  },
  {
    id: 'ai-tools',
    title: 'AI Assistant',
    icon: MessageSquare,
    description: 'Maximize the power of AI in your tender process',
    color: 'bg-orange-500',
    guides: [
      {
        title: 'AI Assistant Overview',
        description: 'Introduction to AI-powered tender analysis and Q&A',
        readTime: '8 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'Asking Effective Questions',
        description: 'How to get the best answers from the AI assistant',
        readTime: '12 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      },
      {
        title: 'AI Usage and Limits',
        description: 'Understanding your AI usage quota and optimization tips',
        readTime: '6 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'Advanced AI Features',
        description: 'Pro tips for power users of the AI assistant',
        readTime: '15 min read',
        type: 'guide',
        difficulty: 'Advanced'
      }
    ]
  },
  {
    id: 'account-management',
    title: 'Account Management',
    icon: Settings,
    description: 'Manage your profile, team, and billing',
    color: 'bg-indigo-500',
    guides: [
      {
        title: 'Company Profile Setup',
        description: 'Optimize your company profile for better visibility',
        readTime: '10 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'Team Management',
        description: 'Invite team members and manage permissions',
        readTime: '12 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      },
      {
        title: 'Billing and Subscriptions',
        description: 'Manage your plan, billing, and payment methods',
        readTime: '8 min read',
        type: 'guide',
        difficulty: 'Beginner'
      },
      {
        title: 'Security Best Practices',
        description: 'Keep your account secure with these recommendations',
        readTime: '9 min read',
        type: 'guide',
        difficulty: 'Beginner'
      }
    ]
  },
  {
    id: 'api-integration',
    title: 'API & Integration',
    icon: BarChart3,
    description: 'Integrate BidWizer with your existing systems',
    color: 'bg-red-500',
    guides: [
      {
        title: 'API Overview',
        description: 'Introduction to BidWizer API and authentication',
        readTime: '15 min read',
        type: 'guide',
        difficulty: 'Advanced'
      },
      {
        title: 'Webhook Configuration',
        description: 'Set up webhooks for real-time notifications',
        readTime: '12 min read',
        type: 'guide',
        difficulty: 'Advanced'
      },
      {
        title: 'Third-party Integrations',
        description: 'Connect with popular business tools and platforms',
        readTime: '18 min read',
        type: 'guide',
        difficulty: 'Advanced'
      },
      {
        title: 'API Rate Limits',
        description: 'Understanding API usage limits and best practices',
        readTime: '8 min read',
        type: 'guide',
        difficulty: 'Intermediate'
      }
    ]
  }
]

const videoTutorials = [
  {
    title: 'BidWizer Platform Tour',
    description: 'Complete walkthrough of the platform features',
    duration: '12:34',
    thumbnail: '/api/placeholder/300/200',
    difficulty: 'Beginner'
  },
  {
    title: 'Creating Your First Tender',
    description: 'Step-by-step video guide for publishers',
    duration: '18:45',
    thumbnail: '/api/placeholder/300/200',
    difficulty: 'Intermediate'
  },
  {
    title: 'AI Assistant Deep Dive',
    description: 'Advanced techniques for using AI tools effectively',
    duration: '25:12',
    thumbnail: '/api/placeholder/300/200',
    difficulty: 'Advanced'
  },
  {
    title: 'Analytics and Reporting',
    description: 'Understanding your tender performance metrics',
    duration: '15:30',
    thumbnail: '/api/placeholder/300/200',
    difficulty: 'Intermediate'
  }
]

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredCategories = docCategories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.guides.some(guide => 
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

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
              Documentation & Guides
            </motion.h1>
            <motion.p 
              className="mx-auto mt-4 max-w-2xl text-xl text-blue-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Comprehensive guides, tutorials, and resources to help you master BidWizer
            </motion.p>
            
            {/* Search Bar */}
            <motion.div 
              className="mx-auto mt-8 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documentation, guides, and tutorials..."
                  className="w-full rounded-full bg-white px-12 py-4 text-slate-900 placeholder-slate-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-16">
          <div className="container">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Quick Start Guides
            </motion.h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <motion.div 
                className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">For Bidders</h3>
                    <p className="text-sm text-slate-600">New to bidding?</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Learn how to find tenders, use AI tools, and submit winning proposals.
                </p>
                <a href="#" className="text-sm text-primary hover:text-primary-600 font-medium flex items-center gap-1">
                  Start here <ChevronRight className="h-3 w-3" />
                </a>
              </motion.div>

              <motion.div 
                className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">For Publishers</h3>
                    <p className="text-sm text-slate-600">Publishing tenders?</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Create tenders, manage responses, and track performance with analytics.
                </p>
                <a href="#" className="text-sm text-primary hover:text-primary-600 font-medium flex items-center gap-1">
                  Start here <ChevronRight className="h-3 w-3" />
                </a>
              </motion.div>

              <motion.div 
                className="rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">AI Assistant</h3>
                    <p className="text-sm text-slate-600">Using AI tools?</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Master the AI assistant for tender analysis and intelligent Q&A.
                </p>
                <a href="#" className="text-sm text-primary hover:text-primary-600 font-medium flex items-center gap-1">
                  Start here <ChevronRight className="h-3 w-3" />
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Documentation Categories */}
        <section className="py-16 bg-white">
          <div className="container">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Browse by Category
            </motion.h2>

            <div className="space-y-8">
              {filteredCategories.map((category, categoryIndex) => (
                <motion.div 
                  key={category.id}
                  className="rounded-lg border border-slate-200 bg-white shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                >
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${category.color} bg-opacity-10`}>
                        <category.icon className={`h-6 w-6 ${category.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-navy-900">{category.title}</h3>
                        <p className="text-slate-600">{category.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {category.guides.map((guide, guideIndex) => (
                        <div 
                          key={guideIndex}
                          className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="flex-shrink-0">
                            <FileText className="h-5 w-5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-navy-900 mb-1">{guide.title}</h4>
                            <p className="text-sm text-slate-600 mb-2">{guide.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {guide.readTime}
                              </div>
                              <span className={`px-2 py-1 rounded ${
                                guide.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                                guide.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {guide.difficulty}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Video Tutorials */}
        <section className="py-16">
          <div className="container">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Video Tutorials
            </motion.h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {videoTutorials.map((video, index) => (
                <motion.div 
                  key={video.title}
                  className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <div className="aspect-video bg-slate-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-slate-600" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        video.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                        video.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {video.difficulty}
                      </span>
                    </div>
                    <h3 className="font-semibold text-navy-900 mb-2">{video.title}</h3>
                    <p className="text-sm text-slate-600">{video.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="py-16 bg-white">
          <div className="container">
            <motion.h2 
              className="text-3xl font-bold text-navy-900 text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Additional Resources
            </motion.h2>
            
            <div className="grid gap-6 md:grid-cols-3">
              <motion.div 
                className="rounded-lg bg-slate-50 p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Download className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-navy-900 mb-2">Download PDF Guides</h3>
                <p className="text-slate-600 mb-4">
                  Get comprehensive PDF guides for offline reference
                </p>
                <button className="text-sm text-primary hover:text-primary-600 font-medium">
                  Download All →
                </button>
              </motion.div>

              <motion.div 
                className="rounded-lg bg-slate-50 p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <ExternalLink className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-navy-900 mb-2">API Reference</h3>
                <p className="text-slate-600 mb-4">
                  Complete API documentation for developers
                </p>
                <a href="#" className="text-sm text-primary hover:text-primary-600 font-medium">
                  View API Docs →
                </a>
              </motion.div>

              <motion.div 
                className="rounded-lg bg-slate-50 p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-navy-900 mb-2">Community Forum</h3>
                <p className="text-slate-600 mb-4">
                  Connect with other users and get help from the community
                </p>
                <a href="/community" className="text-sm text-primary hover:text-primary-600 font-medium">
                  Join Community →
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Help CTA */}
        <section className="py-16 bg-navy-900">
          <div className="container text-center">
            <motion.h2 
              className="text-3xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Still need help?
            </motion.h2>
            <motion.p 
              className="text-xl text-blue-100 mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Our support team is ready to assist you with any questions
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-white font-semibold hover:bg-primary-600 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="/help"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Visit Help Center
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
