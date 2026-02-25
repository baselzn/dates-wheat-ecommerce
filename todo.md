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
