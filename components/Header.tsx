"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  // Handle logo click - logout user and redirect to homepage
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    await signOut({ redirect: false })
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button onClick={handleLogoClick} className="flex items-center cursor-pointer">
            <span className="text-2xl font-bold text-primary">BidWizer</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/tenders"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Tenders
            </Link>
            <Link
              href="/pricing"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/register/bidder/step1">
              <Button>Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/tenders"
                className="text-gray-700 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Tenders
              </Link>
              <Link
                href="/pricing"
                className="text-gray-700 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/terms"
                className="text-gray-700 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="text-gray-700 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Privacy Policy
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link href="/register/bidder/step1" onClick={() => setIsOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

