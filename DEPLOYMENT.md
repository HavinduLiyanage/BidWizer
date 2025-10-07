# BidWizer Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Completed
- [x] Next.js 14 with App Router
- [x] TypeScript strict mode enabled
- [x] Tailwind CSS configured with custom design system
- [x] All 22+ pages implemented
- [x] Responsive design (mobile, tablet, desktop)
- [x] Accessibility features (WCAG AA)
- [x] Component library (shadcn/ui)
- [x] Mock data for development
- [x] Environment variables setup
- [x] No linter errors

### 🔄 Pending (for production)
- [ ] Backend API integration
- [ ] Authentication system
- [ ] Database connections
- [ ] Payment gateway
- [ ] File upload to cloud storage
- [ ] AI API integration
- [ ] Email service
- [ ] Analytics integration
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `NEXT_PUBLIC_FX_USD_LKR=330`
   - Click "Deploy"

3. **Custom Domain** (optional)
   - Add your domain in Vercel dashboard
   - Update DNS records as instructed

### Option 2: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build
   
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   CMD ["node", "server.js"]
   ```

2. **Build and run**
   ```bash
   docker build -t bidwizer .
   docker run -p 3000:3000 -e NEXT_PUBLIC_FX_USD_LKR=330 bidwizer
   ```

### Option 3: Traditional VPS (DigitalOcean, AWS, etc.)

1. **Setup Node.js on server**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and install**
   ```bash
   git clone <your-repo>
   cd Bidwizer_V4
   npm install
   npm run build
   ```

3. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start npm --name "bidwizer" -- start
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Navigation Flow
- [ ] Header navigation works on all pages
- [ ] Footer links navigate correctly
- [ ] Mobile menu opens and closes
- [ ] All internal links work (no 404s)

#### Registration Flow (Bidder)
- [ ] Step 1: Form fields validate
- [ ] Step 2: Data persists from step 1
- [ ] Step 3: Can skip team invite
- [ ] Success page shows after completion
- [ ] Stepper shows correct state

#### Tender Pages
- [ ] Tender listing loads with filters
- [ ] Search filters tenders
- [ ] Tender detail page shows all info
- [ ] AI Q&A interface works
- [ ] Document download buttons present

#### Dashboard Pages
- [ ] Dashboard shows recent tenders
- [ ] Company profile form works
- [ ] Team table displays correctly
- [ ] Billing shows current plan
- [ ] Notifications checkboxes work

#### Publisher Pages
- [ ] Publisher registration works
- [ ] Tender creation form complete
- [ ] Analytics page shows KPIs
- [ ] Publisher dashboard table works

#### Responsive Design
- [ ] Mobile (< 768px): All pages stack correctly
- [ ] Tablet (768-1024px): Layout adapts
- [ ] Desktop (> 1024px): Full layout displays

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA

### Automated Testing Setup (Future)

```bash
# Install testing dependencies
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom

# Run tests
npm test

# Run E2E tests
npm install -D playwright
npx playwright test
```

---

## 🔧 Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_FX_USD_LKR=330
```

### Production (add these to your hosting platform)
```env
NEXT_PUBLIC_FX_USD_LKR=330
NEXT_PUBLIC_API_URL=https://api.bidwizer.com
NEXT_PUBLIC_SITE_URL=https://www.bidwizer.com
```

### Future Backend Integration
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
AWS_S3_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SENDGRID_API_KEY=...
```

---

## 📊 Performance Optimization

### Already Implemented
- ✅ Next.js 14 with App Router (automatic code splitting)
- ✅ Server Components where possible
- ✅ Optimized Tailwind CSS (purges unused styles)
- ✅ Font optimization (Inter from Google Fonts)

### To Add
- [ ] Image optimization with `next/image`
- [ ] API route caching
- [ ] Database query optimization
- [ ] CDN for static assets
- [ ] Compression middleware
- [ ] Service worker for offline support

### Lighthouse Goals
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

---

## 🐛 Debugging

### Common Issues

**Issue**: `Module not found` errors
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Tailwind styles not applying
```bash
npm run build
# Check tailwind.config.ts content paths
```

**Issue**: Environment variables not loading
- Restart dev server after changing .env.local
- Ensure variables start with `NEXT_PUBLIC_` for client-side access

**Issue**: TypeScript errors
```bash
npm run lint
npx tsc --noEmit
```

---

## 📈 Monitoring & Analytics

### To Implement

1. **Error Tracking**
   - Sentry for error monitoring
   - Custom error boundaries

2. **Analytics**
   - Google Analytics 4
   - Plausible (privacy-friendly alternative)
   - Custom event tracking

3. **Performance**
   - Vercel Analytics
   - Web Vitals tracking
   - Real User Monitoring (RUM)

4. **Logging**
   - Winston or Pino for server logs
   - LogRocket for session replay

---

## 🔒 Security Checklist

### Current Status
- ✅ TypeScript strict mode
- ✅ Input validation UI (visual only)
- ✅ HTTPS ready

### To Implement
- [ ] Content Security Policy (CSP)
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention
- [ ] Secure headers (next.config.js)
- [ ] API authentication
- [ ] Role-based access control
- [ ] Input sanitization
- [ ] File upload validation

### Recommended Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

---

## 📞 Support & Maintenance

### Regular Tasks
- Update dependencies monthly
- Security patches immediately
- Monitor error rates
- Review analytics
- Backup database
- Test critical flows

### Documentation
- Keep README.md updated
- Document API changes
- Maintain changelog
- Update component storybook

---

## ✅ Production Launch Checklist

- [ ] All features tested
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Analytics configured
- [ ] Error tracking active
- [ ] Backup strategy implemented
- [ ] Monitoring alerts set up
- [ ] Documentation complete
- [ ] Team trained
- [ ] Support channels ready

---

**Current Status**: ✅ Frontend Complete - Ready for Backend Integration

For questions, refer to README.md or ROUTES.md

