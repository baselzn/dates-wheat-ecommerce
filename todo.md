# Dates & Wheat — Project TODO

## Phase 1: Database & Infrastructure
- [x] Extended Drizzle schema (categories, products, variants, orders, cart, reviews, addresses, coupons, tracking)
- [x] Install additional dependencies (stripe, bcryptjs, jsonwebtoken, zustand)
- [x] Push database migrations (all 15 tables created via direct SQL for TiDB compatibility)
- [x] Seed data (admin, 8 categories, 16 products, 9 variants, 3 coupons, settings)

## Phase 2: Design System & Shared Components
- [x] Global CSS with brand colors/fonts (Playfair Display, Inter, Noto Sans Arabic)
- [x] Shared UI components (ProductCard, CategoryCard, Layout)
- [x] Header/Navbar with cart badge, search, auth state
- [x] Footer with contact info, social links
- [x] Zustand cart store

## Phase 3: Customer Frontend
- [x] Homepage (hero, featured products, categories, offers, testimonials)
- [x] Shop page (grid, filters: category/price/dietary, sort, pagination)
- [x] Product detail page (gallery, variants, add to cart, reviews)
- [x] Cart page (Zustand state, quantity management, VAT calculation)

## Phase 4: Cart & Checkout
- [x] Checkout page (address form, payment method selection)
- [x] Stripe payment integration (via tRPC)
- [x] Cash on Delivery option
- [x] Order confirmation page
- [x] VAT (5%) and shipping fee calculation
- [x] Coupon code validation

## Phase 5: Authentication & Account
- [x] Customer auth: phone OTP + JWT
- [x] Admin auth: email/password + JWT
- [x] User account dashboard
- [x] Order history & tracking
- [x] Profile management
- [x] Saved addresses

## Phase 6: Admin Dashboard
- [x] Admin layout with sidebar navigation
- [x] Admin Dashboard with KPI cards and Recharts
- [x] Products management (CRUD, S3 image upload, inventory)
- [x] Orders management (status updates, tracking number)
- [x] Customers management (list with order stats)
- [x] Categories management

## Phase 7: Admin Advanced Features
- [x] Coupons management (percentage/fixed types)
- [x] Store settings (name, email, phone, VAT, shipping)
- [x] Analytics dashboard with Recharts (revenue, orders, top products)
- [x] Admin sub-router with adminProcedure guard

## Phase 8: Middleware & Polish
- [x] Page view logging in DB
- [x] 21 vitest tests passing (auth, categories, products, admin, orders, coupons)
- [x] Zero TypeScript errors
- [x] App.tsx with all routes wired (customer + admin)
- [x] Database fully seeded

## Bug Fixes
- [x] Fix /auth error: users table missing columns phone, passwordHash, isActive
- [x] Create admin user baselbzn@gmail.com with bcrypt-hashed password and admin role
- [x] Create /about (Our Story) page
- [x] Create /contact page
- [x] Fix order placement: orderId is NaN when inserting order_items (fixed all 6 insertId usages to use LAST_INSERT_ID())

## Marketing Tracking & Pixels
- [x] PixelManager component with cookie consent and platform script injection
- [x] usePixelTrack hook firing to all enabled platforms simultaneously
- [x] Meta Pixel client-side (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Search, CompleteRegistration)
- [x] GA4 gtag.js with enhanced ecommerce events
- [x] Google Ads remarketing + conversion tracking
- [x] Google Tag Manager (takes precedence over direct GA4/Ads)
- [x] TikTok Pixel client-side events
- [x] Snapchat Pixel client-side events
- [x] Twitter/X Universal Website Tag
- [x] Pinterest Tag events
- [x] Meta Conversions API server-side mirroring (tracking.mirrorMeta procedure)
- [x] TikTok Events API server-side mirroring (tracking.mirrorTikTok procedure)
- [x] Admin tracking settings page (/admin/tracking) with 9 platform cards
- [x] Platform cards: toggle, pixel ID, access token (masked), test event button, status badge
- [x] Wire pixel events into all customer pages (Home, Shop, ProductDetail, Checkout, OrderConfirmation, Auth)

## Firebase Phone Auth Integration [COMPLETED]
- [x] Install Firebase SDK (firebase + firebase-admin packages)
- [x] Add Firebase config secrets (apiKey, authDomain, projectId, appId)
- [x] Build Firebase phone auth flow in Auth.tsx (invisible reCAPTCHA + 6-digit OTP)
- [x] Update server auth router: firebaseLogin procedure verifies Firebase ID tokens via Admin SDK
- [x] Update user upsert to handle Firebase UID as openId (firebase_{uid})
- [x] 25 vitest tests passing (4 new Firebase tests)
- [x] Zero TypeScript errors
- [x] Fix reCAPTCHA "already rendered" error in Auth.tsx — singleton verifier with body-appended container, proper reset on resend
- [x] Fix auth/captcha-check-failed: improved error message shows exact domain to add in Firebase Console

## Design Refresh & New Features
- [x] Modern design: gradient hero with Arabic pattern overlay, floating product badges, modern category cards with hover effects, luxury brand story section
- [x] Sliding side cart drawer — auto-opens when products are added, global state via cartStore (isCartOpen/openCart/closeCart)
- [x] Advanced discount rules engine (BOGO, cart total, category, quantity tiers, user role, first order, free shipping, schedule, priority)
- [x] WooCommerce REST API product importer in admin panel (test connection, fetch/import categories, fetch/import products with images, pagination)
- [x] 33 vitest tests passing (8 new tests for discount rules + WooCommerce importer)
- [x] Zero TypeScript errors

## Mobile App Experience & PWA
- [x] Mobile bottom navigation bar (Shop, Categories, Account, Cart) — fixed, safe-area aware
- [x] PWA web app manifest (name, icons, theme color, display: standalone)
- [x] Service worker with offline cache strategy (vite-plugin-pwa)
- [x] Push notification subscription flow (VAPID keys, server endpoint, frontend permission prompt with 5s delay)
- [x] Server-side push notification sender (web-push library)
- [x] Admin UI to send push notifications to all subscribers (with quick templates + delivery stats)

## iOS Add to Home Screen
- [x] iOS A2HS detection (Safari on iPhone/iPad, not already installed as PWA)
- [x] iOS bottom sheet with 3-step visual guide (Share → Add to Home Screen → Add) + arrow pointing to Safari toolbar
- [x] Android/Chrome top-of-page banner using native beforeinstallprompt event with Install CTA
- [x] Both variants dismissible with 7-day snooze stored in localStorage
- [x] Wired into Layout — appears on all storefront pages above the header

## OTP Auth & Smart Checkout Address
- [x] OTP signup modal: name + phone → send OTP → verify → auto-create account
- [x] OTP login modal: phone → send OTP → verify (returning user, passwordless)
- [x] Unified OTPAuthModal component (signup vs login mode, reusable)
- [x] Update sendOtp / verifyOtp + firebaseLogin server procedures to accept name for new users
- [x] Checkout: auth step with Sign In / Create Account / Continue as Guest options
- [x] Checkout shipping step: returning user login prompt with OTP CTA
- [x] Checkout address step: GPS "Use my location" button (Geolocation API + reverse geocode)
- [x] Checkout address step: Google Map picker (click to pin, auto-fills address fields)
- [x] Checkout address step: saved addresses list for logged-in returning users with label + default badge
- [x] Address saved to DB with lat/lng + mapAddress after order
- [x] Address label selector (Home / Work / Other)
- [x] 33 tests passing, 0 TypeScript errors

## Auth Page Tabs & Multi-Image Products
- [x] Auth page: separate Login tab (phone + OTP only)
- [x] Auth page: separate Sign Up tab (name + phone + OTP)
- [x] Auth page: Admin tab remains (email + password)
- [x] Product images table in DB (productId, url, sortOrder, isFeatured)
- [x] Admin product form: multi-image upload with drag-to-reorder
- [x] Admin product form: click to set featured/main image (star button)
- [x] Admin product form: delete individual images
- [x] Product detail page: image gallery with thumbnail strip
- [x] Product detail page: featured image shown first (sorted from DB)
- [x] 33 tests passing, 0 TypeScript errors

## Admin Login 2FA
- [ ] Remove Admin tab from public /auth page (keep Login + Sign Up only)
- [ ] Dedicated /admin login page with email/password step
- [ ] Admin OTP 2FA: after password check, send 6-digit OTP to admin email
- [ ] Admin OTP verification step on /admin login page
- [ ] Server: adminLogin procedure returns {requiresOtp: true} after password check
- [ ] Server: adminVerifyOtp procedure verifies OTP and issues session cookie
- [ ] OTP stored in DB with 10-minute expiry
- [ ] /admin route redirects to /admin/login if not authenticated

## Production Readiness Audit

### Security
- [ ] Install & configure helmet.js (HTTP security headers)
- [ ] Install express-rate-limit (OTP endpoint rate limiting)
- [ ] OTP brute-force protection (max 5 attempts per phone per 10 min)
- [ ] Admin route guard on frontend (redirect non-admins from /admin/*)
- [ ] Input length validation on all tRPC inputs

### SEO & Meta
- [ ] Dynamic OG/Twitter meta tags per page (product, category, home)
- [ ] robots.txt file
- [ ] sitemap.xml generation endpoint
- [ ] JSON-LD structured data for products (Product schema)
- [ ] Canonical URL meta tag in index.html

### UX & Storefront
- [ ] Real wishlist (persisted to DB for logged-in users, localStorage for guests)
- [ ] Product search results page (/search?q=)
- [ ] Breadcrumbs on product detail and category pages
- [ ] Product reviews display (star rating, review list on product page)
- [ ] Related products section on product detail page
- [ ] Loading skeletons for product grid and product detail
- [ ] Footer with links to Privacy Policy, Terms, Contact

### Checkout & Orders
- [ ] Order status tracking page (/track-order) for guests
- [ ] Guest order lookup by order number + phone
- [ ] Admin orders list: clickable rows linking to /admin/orders/:id
- [ ] Admin orders: CSV export
- [ ] Low stock alert badge in admin products list (stock < 10)

### Performance
- [ ] Image lazy loading on product cards and grids
- [ ] Vite code splitting (vendor, admin, storefront chunks)
- [ ] PWA offline fallback page

### Legal & Compliance
- [ ] Privacy Policy page (/privacy)
- [ ] Terms & Conditions page (/terms)
- [ ] VAT clearly shown at checkout (5% UAE VAT)

## Build & Performance Fixes
- [x] PWA maximumFileSizeToCacheInBytes increased to 5 MB (fixes build failure)
- [x] Vite code splitting: vendor, trpc, ui chunks configured
- [x] Admin pages lazy-loaded with React.lazy() + Suspense (main bundle 1935 KB → 1197 KB)
- [x] Production build completes successfully (33 tests passing, 0 TS errors)

## Build & Performance Fixes
- [x] PWA maximumFileSizeToCacheInBytes increased to 5 MB (fixes build failure)
- [x] Vite code splitting: vendor, trpc, ui chunks configured
- [x] Admin pages lazy-loaded with React.lazy() + Suspense (main bundle 1935 KB -> 1197 KB)
- [x] Production build completes successfully (33 tests passing, 0 TS errors)

## Inventory Management Module
- [ ] DB: warehouses table
- [ ] DB: stock_levels table
- [ ] DB: stock_movements table
- [ ] DB: stock_adjustments + stock_adjustment_items tables
- [ ] Server: inventory tRPC router (CRUD warehouses, stock levels, movements, adjustments)
- [ ] Admin: Stock Levels page (/admin/inventory) - per-warehouse grid with low-stock alerts
- [ ] Admin: Stock Movements page (/admin/inventory/movements) - filterable history
- [ ] Admin: Adjustments page (/admin/inventory/adjustments) - draft/confirm workflow
- [ ] Admin: Warehouses page (/admin/inventory/warehouses) - CRUD
- [ ] Integration: auto-deduct stock on e-commerce order placement
- [ ] Integration: auto-deduct stock on POS sale

## POS Module
- [ ] DB: pos_sessions table
- [ ] DB: pos_orders + pos_order_items tables
- [ ] DB: pos_payment_methods table
- [ ] Server: POS tRPC router (sessions, orders, items, payment methods)
- [ ] Admin: POS Terminal page (/admin/pos) - full-screen cashier UI
- [ ] Admin: POS Sessions page (/admin/pos/sessions) - open/close sessions, shift summary
- [ ] Admin: POS Orders page (/admin/pos/orders) - order history, receipt view
- [ ] POS: product search + quick-add to cart
- [ ] POS: multiple payment methods (cash, card, split)
- [ ] POS: receipt print view (print-friendly)
- [ ] POS: cash drawer open/close with opening/closing balance
- [ ] Integration: POS sale deducts inventory stock_movements

## Manufacturing Module
- [ ] DB: raw_materials table
- [ ] DB: recipes + recipe_ingredients tables
- [ ] DB: production_orders + production_order_ingredients tables
- [ ] DB: suppliers table
- [ ] DB: purchase_orders + purchase_order_items tables
- [ ] Server: manufacturing tRPC router (recipes, production orders, raw materials, suppliers, POs)
- [ ] Admin: Recipes/BOMs page (/admin/manufacturing/recipes) - ingredient builder
- [ ] Admin: Production Orders page (/admin/manufacturing/production) - workflow management
- [ ] Admin: Raw Materials page (/admin/manufacturing/materials) - stock + reorder
- [ ] Admin: Suppliers page (/admin/manufacturing/suppliers) - CRUD
- [ ] Admin: Purchase Orders page (/admin/manufacturing/purchases) - draft/receive workflow
- [ ] Integration: production completion auto-updates inventory

## Accounting Module
- [ ] DB: accounts (chart of accounts) table
- [ ] DB: journal_entries + journal_lines tables
- [ ] DB: fiscal_years table
- [ ] DB: tax_rates table
- [ ] Server: accounting tRPC router (accounts, journal entries, reports)
- [ ] Seed: default UAE chart of accounts (assets/liabilities/equity/revenue/expense)
- [ ] Admin: Chart of Accounts page (/admin/accounting/accounts) - tree view + CRUD
- [ ] Admin: Journal Entries page (/admin/accounting/journal) - double-entry form
- [ ] Admin: P&L Report page (/admin/accounting/pnl) - date range, revenue vs expenses
- [ ] Admin: Balance Sheet page (/admin/accounting/balance-sheet) - assets vs liabilities+equity
- [ ] Admin: VAT Report page (/admin/accounting/vat) - input/output VAT summary
- [ ] Integration: auto-journal on e-commerce order (AR debit, Sales credit, VAT credit)
- [ ] Integration: auto-journal on POS sale (Cash/Card debit, Sales credit)
- [ ] Integration: auto-journal on production completion

## Navigation & Routing
- [ ] Update AdminLayout sidebar with grouped navigation (E-Commerce / Inventory / POS / Manufacturing / Accounting / Tools)
- [ ] Register all new routes in App.tsx with lazy loading
- [ ] Write vitest tests for all new routers

## New Business Modules (Phase 2)

### Inventory Management
- [x] Warehouses CRUD
- [x] Stock Levels view (per product per warehouse)
- [x] Stock Movements log
- [x] Stock Adjustments (cycle count)
- [x] Stock Transfers between warehouses
- [x] Inventory tRPC router (warehouses, movements, adjustments, transfers)

### POS (Point of Sale)
- [x] POS Terminal cashier interface
- [x] POS Sessions management
- [x] POS Orders list
- [x] Payment Methods management
- [x] POS tRPC router (sessions, orders, payment methods)

### Manufacturing
- [x] Suppliers CRUD
- [x] Raw Materials CRUD
- [x] Recipes / Bill of Materials
- [x] Production Orders management
- [x] Purchase Orders with receive workflow
- [x] Manufacturing tRPC router

### Accounting
- [x] Chart of Accounts (grouped by type)
- [x] Journal Entries with double-entry validation
- [x] Financial Reports (P&L, Balance Sheet)
- [x] Accounting tRPC router

### Integration
- [x] All modules wired into AdminLayout sidebar (grouped sections)
- [x] All routes registered in App.tsx with lazy loading
- [x] Database schema extended with all new tables
- [x] Migration applied (0009)
- [x] Production build passing (0 errors)
- [x] All 33 tests passing

## E-Commerce Enhancement (Tier 1-3)

### Database & Backend
- [x] DB: 15 new tables (wishlists, product_reviews, flash_sales, flash_sale_products, product_bundles, product_bundle_items, product_questions, loyalty_points, loyalty_settings, abandoned_carts, order_tracking_events, recently_viewed, review_votes, feature_flags, referral_codes, referral_uses)
- [x] Migration 0011 applied successfully
- [x] Backend ecommerce tRPC router created (wishlist, flashSales, bundles, qa, loyalty, featureFlags, referral, tracking, abandonedCart, recentlyViewed, reviews)
- [x] Ecommerce router wired into main router

### API Fixes
- [x] Fix flashSales.active procedure to join product data (returns product name, image, slug, computed salePrice)
- [x] Fix LoyaltyPoints.tsx to use balance.balance instead of balance.points

### New Pages
- [x] Search page (/search?q=) with full-text product search and filters
- [x] Wishlist page (/wishlist) with add-to-cart functionality
- [x] Order Tracking page (/order-tracking) with status timeline
- [x] Flash Sales page (/flash-sales) with countdown timer and product cards
- [x] Loyalty Points page (/loyalty) with balance, tier, history, and earn/redeem info

### New Components
- [x] ProductQA component (product detail page Q&A section with ask form and collapsible answers)

### Admin Pages
- [x] Feature Flags admin page (/admin/feature-flags) with toggles for 14 e-commerce features

### Navigation & Routing
- [x] All new customer pages added to App.tsx routes
- [x] Feature Flags route added to App.tsx
- [x] Header search updated to navigate to /search page
- [x] Header wishlist link updated to /wishlist
- [x] Header user dropdown: Wishlist + Loyalty Points links added
- [x] Mobile menu: Wishlist + Loyalty Points links added
- [x] AdminLayout sidebar: Feature Flags added to Tools section
- [x] ProductQA component integrated into ProductDetail page

### Quality
- [x] 0 TypeScript errors
- [x] 33 tests passing

## Sprint 2 — Continued Build

### Admin & E-Commerce
- [ ] Admin Q&A Management page (/admin/ecommerce/qa) — list all questions across products, answer inline, publish/unpublish, delete
- [ ] Flash Sales homepage banner — prominent strip with countdown timer linking to /flash-sales
- [ ] Stock Urgency indicators — "Only N left!" badge on product cards when stock < 5
- [ ] Recently Viewed products — track in localStorage, show horizontal scroll on homepage and product pages

### Inventory
- [ ] Reorder Point Alerts — set min stock level per product; push notification + admin alert when stock falls below threshold
- [ ] Reorder settings in product admin form (reorderPoint field)
- [ ] Low stock dashboard widget in admin inventory

### Accounting Integration
- [ ] Auto-post journal entries from e-commerce orders (AR debit, Sales credit, VAT credit)
- [ ] Auto-post journal entries from POS sales (Cash debit, Sales credit)

### Admin UX
- [ ] CSV export for orders list
- [ ] CSV export for products list
- [ ] Column sorting on admin orders table

## Sprint 2 — Continued E-Commerce Build (COMPLETED)
- [x] Admin Q&A Management page (/admin/ecommerce/qa) — list all questions, answer inline, toggle publish, delete
- [x] Flash Sales banner on homepage — shows active sale name, countdown timer, CTA link; auto-hides when no active sale
- [x] Stock urgency badges on ProductCard — "Only N left!" badge when stockQty < 5
- [x] Recently Viewed products — localStorage tracking hook + horizontal scroll section on homepage and product detail
- [x] Reorder Point Alerts — inventory.alerts.checkAndNotify mutation sends owner push notification listing all below-reorder-point products; "Notify Owner (N)" button appears in Stock Levels page when alerts exist
- [x] Auto-post journal entries — autoPostOrderJournal() called in updateOrderStatus (paid) and updateOrderStripe; autoPostPOSJournal() helper ready; uses code-based account lookup (1000/1100/4000/2200/4100)
- [x] CSV export utility (client/src/lib/csvExport.ts) — BOM-prefixed, Excel-compatible
- [x] CSV export on Orders admin page (already existed, confirmed)
- [x] CSV export on Products admin page — "Export CSV" button added to toolbar
- [x] CSV export on Customers admin page — "Export CSV" button added to toolbar
- [x] 0 TypeScript errors, 33 tests passing

## Sprint 3 — Security, SEO & UX Polish

### Admin Login 2FA
- [ ] Remove Admin tab from public /auth page (keep Login + Sign Up only)
- [ ] Dedicated /admin/login page with email/password step
- [ ] Admin OTP 2FA: after password check, send 6-digit OTP to admin email via notifyOwner
- [ ] Server: adminLogin procedure returns {requiresOtp: true} after password check
- [ ] Server: adminVerifyOtp procedure verifies OTP and issues session cookie
- [ ] OTP stored in DB with 10-minute expiry
- [ ] /admin/* routes redirect to /admin/login if not authenticated as admin

### Security
- [ ] Install & configure helmet.js (HTTP security headers)
- [ ] Install express-rate-limit (OTP + login endpoint rate limiting)
- [ ] Admin route guard on frontend (redirect non-admins from /admin/*)
- [ ] Input length validation on all tRPC inputs

### SEO & Meta
- [ ] robots.txt file in client/public
- [ ] sitemap.xml generation endpoint (/sitemap.xml)
- [ ] JSON-LD structured data for products (Product schema in ProductDetail)
- [ ] Dynamic OG/Twitter meta tags per page (product, home, category)
- [ ] Canonical URL meta tag in index.html

### UX & Storefront
- [ ] Breadcrumbs on product detail and category pages
- [ ] Loading skeletons for product grid and product detail
- [ ] Guest order tracking page (/track-order) with order number + phone lookup
- [ ] Privacy Policy page (/privacy)
- [ ] Terms & Conditions page (/terms)
- [ ] Footer links to /privacy and /terms

## Sprint 3 — Security, SEO & UX (COMPLETED)

- [x] Admin Login 2FA — /admin/login page with email+password + 6-digit OTP via notifyOwner
- [x] AdminLayout redirects to /admin/login instead of /auth
- [x] Security: helmet.js, rate limiting (OTP: 10/10min, API: 300/min) — already in place, verified
- [x] Dynamic sitemap.xml endpoint — lists all products, categories, and static pages with lastmod/priority
- [x] usePageMeta hook — sets document.title, OG tags, canonical URL, JSON-LD per page
- [x] Product detail pages — JSON-LD Product schema (name, price, availability, brand, sku)
- [x] Shop page — breadcrumbs in header, dynamic meta title/description per category
- [x] 0 TypeScript errors, 33 tests passing

## Chart of Accounts & Auto-Posting (COMPLETED)

- [x] Verified Chart of Accounts fully seeded (65 accounts across asset/liability/equity/revenue/expense/cogs)
- [x] Added account 4200 — Sales Discounts & Returns (contra-revenue) for coupon tracking
- [x] Fixed auto-posting codes to use leaf accounts: 1001 (Cash on Hand), 1100 (AR), 4001 (Sales Revenue), 4003 (POS Sales Revenue), 4101 (Shipping Income), 4200 (Sales Discounts), 2200 (VAT Payable)
- [x] Verified journal entry balance math: DR Cash/AR + DR Discounts = CR Sales + CR VAT + CR Shipping (always balanced)
- [x] Marked all 7 auto-posting accounts as isSystem=true (cannot be deleted from admin UI)
- [x] 0 TypeScript errors, 33 tests passing
