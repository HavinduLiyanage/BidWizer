"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Building2, 
  Settings, 
  CreditCard, 
  Users, 
  Bell, 
  LogOut, 
  ChevronDown,
  HelpCircle
} from "lucide-react";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    {
      section: "Account",
      items: [
        { icon: User, label: "My Profile", href: "/profile", description: "Manage your personal info" },
        { icon: Building2, label: "Company Profile", href: "/company/profile", description: "View company details" },
      ]
    },
    {
      section: "Settings",
      items: [
        { icon: Users, label: "Team Members", href: "/company/team", description: "Manage team access" },
        { icon: CreditCard, label: "Billing & Plans", href: "/company/billing", description: "Subscription & payments" },
        { icon: Bell, label: "Notifications", href: "/settings/notifications", description: "Email & alert preferences" },
        { icon: Settings, label: "Settings", href: "/settings", description: "Account preferences" },
      ]
    },
    {
      section: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", href: "/help", description: "Get support" },
      ]
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-semibold">JD</span>
        </div>
        
        {/* User Info - Hidden on mobile */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-semibold text-gray-900">John Doe</div>
          <div className="text-xs text-gray-500">Acme Corp</div>
        </div>

        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">John Doe</div>
                <div className="text-xs text-gray-600 truncate">CEO, Acme Corp</div>
                <div className="text-xs text-gray-500">john.doe@acmecorp.com</div>
              </div>
            </div>
          </div>

          {/* Menu Sections */}
          {menuItems.map((section, idx) => (
            <div key={idx} className="py-2">
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.section}
              </div>
              {section.items.map((item, itemIdx) => (
                <Link
                  key={itemIdx}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-4 w-4 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          ))}

          {/* Logout */}
          <div className="border-t border-gray-100 pt-2 mt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // Handle logout
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <LogOut className="h-4 w-4 text-gray-600 group-hover:text-red-600 transition-colors" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 group-hover:text-red-600">Log out</div>
                <div className="text-xs text-gray-500">Sign out of your account</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

