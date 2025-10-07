# BidWizer Routes Reference

## ✅ All 22 Routes Implemented

### 🏠 Marketing Pages (Public)

1. **/** - Home Page
   - Hero section with CTA
   - Feature showcase
   - How it works
   - AI tools section
   - Customer testimonials
   - Final CTA

2. **/pricing** - Pricing Page
   - Video placeholder
   - Three pricing tiers (Free, Pro, Enterprise)
   - Monthly/Yearly toggle
   - USD + LKR pricing
   - FAQ section

3. **/tenders** - Tender Listing
   - Search and filters
   - Tender cards grid
   - Publisher logos
   - Category badges
   - Deadline display

4. **/tenders/[id]** - Tender Detail
   - Full tender description
   - Publisher info with follow button
   - Document downloads
   - AI Q&A sidebar
   - Usage tracking chip

5. **/terms** - Terms of Service
   - Legal content
   - Prose typography

6. **/privacy** - Privacy Policy
   - Legal content
   - GDPR compliance info

---

### 🔐 Authentication Pages

7. **/login** - Login Page
   - Email + password form
   - Forgot password link
   - Sign up link

8. **/forgot-password** - Password Reset Request
   - Email input
   - Success state

9. **/reset-password** - Password Reset Form
   - New password fields
   - Validation

---

### 📝 Bidder Registration Flow

10. **/register/bidder/step1** - Account Setup
    - Personal details
    - Company name
    - Email + password
    - Progress stepper (1/3)

11. **/register/bidder/step2** - Company Profile
    - Industry selection
    - Company website
    - About company
    - Progress stepper (2/3)

12. **/register/bidder/step3** - Team Invite
    - Team member details
    - Skip option
    - Progress stepper (3/3)

13. **/register/bidder/ready** - Success Page
    - Completion message
    - CTAs to dashboard/tenders
    - All steps completed ✓

---

### 📊 Bidder Dashboard & Company

14. **/dashboard** - Bidder Dashboard
    - Followed publishers
    - Recent tenders table
    - Quick actions

15. **/company/profile** - Company Profile
    - Logo upload
    - Company details form
    - Save changes

16. **/company/team** - Team Management
    - Team members table
    - Invite member button
    - Seat usage indicator
    - Edit/remove actions

17. **/company/billing** - Plan & Billing
    - Current plan card
    - Features list
    - Upgrade button
    - Billing history (empty state)

18. **/company/notifications** - Notification Settings
    - Email preference checkboxes
    - Save preferences

---

### 📰 Publisher Pages

19. **/publisher/register** - Publisher Registration
    - Split screen layout
    - Organization details
    - Contact person
    - Password setup

20. **/publisher/dashboard** - Publisher Dashboard
    - My tenders table
    - New tender button
    - Status badges
    - View/Edit/Analytics/Delete actions

21. **/publisher/tenders/new** - Create Tender
    - Basic information
    - Category selection
    - Deadline & budget
    - Requirements
    - Document upload (dropzone)
    - Save as draft / Publish

22. **/publisher/tenders/[id]/analytics** - Tender Analytics
    - KPI cards (Views, Visitors, Downloads, Questions)
    - Period toggle (7/30 days)
    - Activity feed
    - Percentage changes

---

### 💳 Payment Pages

23. **/payment/success** - Payment Successful
    - Success icon
    - Confirmation message
    - Navigation CTAs

24. **/payment/failed** - Payment Failed
    - Error icon
    - Error message
    - Try again / Back CTAs

---

## 🎨 Design System Applied

### Typography
- **Inter font** throughout
- Proper heading hierarchy (H1-H4)
- Consistent line heights

### Colors
- Primary Blue: `#2563EB`
- Dark Navy: `#0A1F44`
- Success: `#10B981`
- Error: `#EF4444`
- Neutral grays for text/borders

### Components
- 48px button/input heights
- 8px border radius on inputs
- 16px border radius on cards
- Consistent spacing (4, 6, 8, 12, 16, 24, 32)

### Accessibility
- Proper labels with `htmlFor`
- ARIA labels on icons
- Focus visible states
- Keyboard navigation
- Color contrast WCAG AA compliant

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
open http://localhost:3000
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px (single column)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (full layout)

All pages are fully responsive with mobile-first design.

---

## ✅ Completion Checklist

- [x] All 22+ routes implemented
- [x] Header component with navigation
- [x] Footer component with links
- [x] Stepper component (3 steps)
- [x] Form validation ready
- [x] Responsive design
- [x] Accessibility features
- [x] Mock data utilities
- [x] FX conversion (USD/LKR)
- [x] Plan management (Free/Pro/Enterprise)
- [x] TypeScript strict mode
- [x] No linter errors
- [x] Clean, maintainable code

---

**Status**: ✅ Production-Ready Frontend (Backend integration pending)

