'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { UserMenu } from './user-menu'
import { signOut } from 'next-auth/react'

const nav = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { 
    label: 'Support', 
    href: '/support', 
    hasDropdown: true,
    dropdownItems: [
      { label: 'Contact Support', href: '/contact', description: 'Get help from our team' },
      { label: 'Documentation', href: '/docs', description: 'User guides and tutorials' }
    ]
  }
]

interface SiteHeaderProps {
  variant?: 'homepage' | 'page'
}

export default function SiteHeader({ variant = 'homepage' }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  
  // Check if we're in registration flow - hide UserMenu during registration
  const isRegistrationFlow = pathname?.includes('/register/bidder/') && 
    !pathname?.includes('/ready') // Show UserMenu on ready page (after completion)

  // Handle logo click - logout user and redirect to homepage
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    await signOut({ redirect: false })
    window.location.href = '/'
  }

  if (variant === 'page') {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer">
            <span className="text-xl font-bold text-navy-900">Logo</span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {nav.map(item => (
              <div key={item.label} className="relative group">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors"
                >
                  {item.label}
                  {item.hasDropdown && <ChevronDown className="h-3 w-3" />}
                </Link>
                
                {/* Dropdown Menu */}
                {item.hasDropdown && item.dropdownItems && (
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-white shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      {item.dropdownItems.map((dropdownItem) => (
                        <Link
                          key={dropdownItem.label}
                          href={dropdownItem.href}
                          className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                        >
                          <div className="font-medium">{dropdownItem.label}</div>
                          <div className="text-xs text-slate-500 mt-1">{dropdownItem.description}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {!isRegistrationFlow && <UserMenu />}
          </div>

          <div className="flex md:hidden items-center gap-2">
            {!isRegistrationFlow && <UserMenu />}
            <button
              className="text-slate-700"
              onClick={() => setOpen(v => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="container py-3 space-y-3">
              {nav.map(item => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className="block text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.hasDropdown && item.dropdownItems && (
                    <div className="ml-4 mt-2 space-y-2">
                      {item.dropdownItems.map((dropdownItem) => (
                        <Link
                          key={dropdownItem.label}
                          href={dropdownItem.href}
                          className="block text-xs text-slate-600 hover:text-navy-900 transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          {dropdownItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2">
                <Link
                  href="/login"
                  className="block w-full rounded-full bg-primary px-6 py-2 text-center text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    )
  }

  return (
    <>
      {/* Top background section */}
      <div className="bg-navy-900 pb-20">
        {/* Oval navbar */}
        <div className="container pt-4">
          <motion.header
            className="relative z-50 mx-auto max-w-4xl rounded-full bg-white/90 px-6 py-3 shadow-lg backdrop-blur-sm overflow-visible"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between">
              {/* Logo */}
              <button onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer">
                <span className="text-xl font-bold text-navy-900">Logo</span>
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                {nav.map(item => (
                  <div key={item.label} className="relative group">
                    <Link
                      href={item.href}
                      className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors"
                    >
                      {item.label}
                      {item.hasDropdown && <ChevronDown className="h-3 w-3" />}
                    </Link>
                    
                    {/* Dropdown Menu */}
                    {item.hasDropdown && item.dropdownItems && (
                      <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-white shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                        <div className="py-2">
                          {item.dropdownItems.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.label}
                              href={dropdownItem.href}
                              className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                            >
                              <div className="font-medium">{dropdownItem.label}</div>
                              <div className="text-xs text-slate-500 mt-1">{dropdownItem.description}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden md:flex items-center">
                <Link
                  href="/login"
                  className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  Login
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden text-slate-700"
                onClick={() => setOpen(v => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {open && (
              <motion.div
                className="md:hidden border-t border-slate-200 mt-4 pt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-3">
                  {nav.map(item => (
                    <div key={item.label}>
                      <Link
                        href={item.href}
                        className="block text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                      {item.hasDropdown && item.dropdownItems && (
                        <div className="ml-4 mt-2 space-y-2">
                          {item.dropdownItems.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.label}
                              href={dropdownItem.href}
                              className="block text-xs text-slate-600 hover:text-navy-900 transition-colors"
                              onClick={() => setOpen(false)}
                            >
                              {dropdownItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="block w-full rounded-full bg-primary px-6 py-2 text-center text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      Login
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.header>
        </div>
      </div>
    </>
  )
}
