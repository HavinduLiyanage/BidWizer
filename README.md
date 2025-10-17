# BidWizer Platform - Frontend Application

A comprehensive tender management platform built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

### For Bidders
- **User Registration**: Multi-step registration flow with company profile setup
- **Tender Discovery**: Browse and search tenders with advanced filters
- **AI-Powered Q&A**: Ask questions about tenders using AI
- **Publisher Following**: Follow publishers to get notified of new tenders
- **Dashboard**: View recent tenders and followed publishers
- **Company Management**: Profile, team, billing, and notification settings

### For Publishers
- **Publisher Registration**: Dedicated registration flow
- **Tender Management**: Create, edit, and manage tenders
- **Analytics Dashboard**: Track views, downloads, and engagement
- **Document Upload**: Attach multiple documents to tenders

### General
- **Responsive Design**: Mobile-first approach with tablet and desktop layouts
- **Accessible**: WCAG AA compliant with keyboard navigation
- **Modern UI**: Clean, professional interface with consistent design system

## 📁 Project Structure

```
├── app/
│   ├── (marketing)/          # Public marketing pages
│   │   ├── page.tsx          # Home page
│   │   ├── pricing/          # Pricing page with video
│   │   ├── tenders/          # Tender listing and details
│   │   ├── terms/            # Terms of Service
│   │   └── privacy/          # Privacy Policy
│   ├── (auth)/               # Authentication pages
│   │   ├── login/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── register/bidder/  # 4-step registration flow
│   ├── (app)/                # Bidder dashboard
│   │   ├── dashboard/
│   │   └── company/          # Company management
│   ├── (publisher)/          # Publisher pages
│   │   ├── register/
│   │   ├── dashboard/
│   │   └── tenders/          # Tender CRUD & analytics
│   └── payment/              # Payment success/failed
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── Header.tsx            # Global header
│   ├── Footer.tsx            # Global footer
│   ├── Stepper.tsx           # Registration stepper
│   ├── UsageChip.tsx         # AI usage indicator
│   └── forms/                # Form components
├── lib/
│   ├── utils.ts              # Utility functions
│   ├── fx.ts                 # Currency conversion
│   ├── entitlements.ts       # Plan management
│   ├── guards.ts             # Auth helpers (stub)
│   └── mock-data.ts          # Mock data for development
└── public/                   # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Font**: Inter (Google Fonts)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Bidwizer_V4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   # Currency conversion
   NEXT_PUBLIC_FX_USD_LKR=330
   
   # Authentication
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   
   # Database
   DATABASE_URL=your-database-url-here
   DIRECT_URL=your-direct-database-url-here
   
   # Email (Resend)
   RESEND_API_KEY=your-resend-api-key-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Design System

### Colors
- **Primary Blue**: `#2563EB` - Buttons, links, active states
- **Dark Navy**: `#0A1F44` - Hero backgrounds
- **Success**: `#10B981` - Positive actions
- **Error**: `#EF4444` - Error states
- **Warning**: `#F59E0B` - Warnings

### Typography
- **Font Family**: Inter
- **H1**: 48px / 3rem
- **H2**: 36px / 2.25rem
- **H3**: 24px / 1.5rem
- **Body**: 16px / 1rem
- **Small**: 12px / 0.75rem

### Components
- **Button Height**: 48px
- **Input Height**: 48px
- **Border Radius**: 8px (inputs), 16px (cards)
- **Card Shadow**: Subtle shadow-sm
- **Spacing**: 4, 6, 8, 12, 16, 20, 24, 32

## 🗺️ Routes

### Marketing (/)
- `/` - Home page
- `/pricing` - Pricing with video
- `/tenders` - Tender listing
- `/tenders/[id]` - Tender details
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

### Authentication
- `/login` - Login page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/register/bidder/step1` - Registration step 1
- `/register/bidder/step2` - Registration step 2
- `/register/bidder/step3` - Registration step 3
- `/register/bidder/ready` - Registration complete

### API Routes
- `/api/auth/[...nextauth]` - NextAuth.js authentication
- `/api/auth/register` - User registration with email verification
- `/api/auth/verify` - Email verification endpoint
- `/api/auth/forgot` - Password reset request
- `/api/auth/reset` - Password reset with token

### Bidder Dashboard (/dashboard)
- `/dashboard` - Main dashboard
- `/company/profile` - Company profile
- `/company/team` - Team management
- `/company/billing` - Plan & billing
- `/company/notifications` - Email preferences

### Publisher (/publisher)
- `/publisher/register` - Publisher registration
- `/publisher/dashboard` - Publisher dashboard
- `/publisher/tenders/new` - Create tender
- `/publisher/tenders/[id]/analytics` - Tender analytics

### Payment
- `/payment/success` - Payment successful
- `/payment/failed` - Payment failed

## 🧪 Development

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm run start
```

### Lint code
```bash
npm run lint
```

## 📝 Key Features Implementation

### Authentication System
Complete authentication system with:
- **NextAuth.js**: Credentials provider with JWT sessions
- **Zod Validation**: Input validation for all auth endpoints
- **bcrypt**: Secure password hashing (12 rounds)
- **Resend**: Email service for verification and password reset
- **Email Verification**: Required for account activation
- **Password Reset**: Secure token-based password reset flow

### Multi-Step Registration
The bidder registration flow uses localStorage to persist data across steps:
1. **Step 1**: Account details (name, email, password)
2. **Step 2**: Company profile (industry, website, about)
3. **Step 3**: Team invitations (optional)
4. **Ready**: Success confirmation

### AI Q&A Integration
- UI-only implementation with usage tracking
- Shows usage chip (e.g., "84/120 questions this month")
- Mock AI responses for demonstration

### Currency Conversion
- USD prices with LKR conversion
- Exchange rate from environment variable
- Format: `$19 ≈ LKR 6,270`

### Mock Data
All data is currently mocked for development:
- Tenders, publishers, team members
- Analytics data with sparklines
- Activity feeds

## 🎯 Next Steps (Production-Ready)

To make this production-ready, you'll need to:

1. **Backend Integration**
   - Connect to real API endpoints
   - Implement actual authentication
   - Add database persistence

2. **Form Validation**
   - Add Zod schemas to all forms
   - Implement React Hook Form controllers
   - Add proper error handling

3. **State Management**
   - Replace localStorage with proper state management
   - Consider Zustand or Redux for global state

4. **Payment Integration**
   - Integrate Stripe or other payment gateway
   - Implement webhook handlers

5. **File Uploads**
   - Add real file upload functionality
   - Implement cloud storage (S3, etc.)

6. **AI Integration**
   - Connect to actual AI API (OpenAI, etc.)
   - Implement proper usage tracking

7. **Testing**
   - Add unit tests (Jest, React Testing Library)
   - Add E2E tests (Playwright, Cypress)
   - Test accessibility with axe-core

8. **Performance**
   - Add image optimization
   - Implement code splitting
   - Add caching strategies

## 🔒 Security Notes

Current stub implementations need security enhancements:
- Add proper authentication (NextAuth.js, Auth0, etc.)
- Implement CSRF protection
- Add rate limiting
- Secure API routes
- Validate all inputs server-side

## 📄 License

Copyright © 2024 BidWizer. All rights reserved.

## 👥 Support

For questions or support, contact:
- Email: support@bidwizer.com
- Website: https://www.bidwizer.com

---


