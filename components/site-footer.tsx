import Link from 'next/link'
import { Facebook, Twitter, Linkedin, Youtube } from 'lucide-react'

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Integrations', href: '/integrations' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'API', href: '/api' }
    ]
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Media kit', href: '/media-kit' },
      { label: 'Contact', href: '/contact' }
    ]
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' }
    ]
  }
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Logo & Newsletter */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block text-2xl font-bold text-navy-900">
              Logo
            </Link>
            <p className="mt-4 text-sm text-slate-600">
              Transforming tender management with intelligent technology.
            </p>
            
            <div className="mt-6">
              <p className="text-sm font-semibold text-navy-900">Stay up to date</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600">
                  Subscribe
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Join our newsletter to stay up to date on features and releases.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="text-sm font-semibold text-navy-900">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 hover:text-navy-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row">
          <p className="text-sm text-slate-600">
            © 2025 BidWizer. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <Link href="#" className="text-slate-400 hover:text-navy-900">
              <Facebook className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-slate-400 hover:text-navy-900">
              <Twitter className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-slate-400 hover:text-navy-900">
              <Linkedin className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-slate-400 hover:text-navy-900">
              <Youtube className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Terms & Privacy */}
        <div className="mt-4 text-center">
          <Link href="/privacy" className="text-xs text-slate-500 hover:text-navy-900">
            Privacy Policy
          </Link>
          <span className="mx-2 text-slate-300">•</span>
          <Link href="/terms" className="text-xs text-slate-500 hover:text-navy-900">
            Terms of Service
          </Link>
          <span className="mx-2 text-slate-300">•</span>
          <Link href="/cookies" className="text-xs text-slate-500 hover:text-navy-900">
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}

