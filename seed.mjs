import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

console.log("🌱 Seeding Dates & Wheat database...");

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = [
  { nameEn: "Arabic Sweets", nameAr: "حلويات عربية", slug: "arabic-sweets", description: "Traditional handcrafted Arabic confectionery", sortOrder: 1, imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400" },
  { nameEn: "Gluten Free", nameAr: "خالي من الغلوتين", slug: "gluten-free", description: "Delicious sweets without gluten", sortOrder: 2, imageUrl: "https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=400" },
  { nameEn: "Sugar Free", nameAr: "خالي من السكر", slug: "sugar-free", description: "Healthy sweets without added sugar", sortOrder: 3, imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400" },
  { nameEn: "Nuts", nameAr: "مكسرات", slug: "nuts", description: "Premium quality nuts and mixed selections", sortOrder: 4, imageUrl: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400" },
  { nameEn: "Arabic Coffee", nameAr: "قهوة عربية", slug: "arabic-coffee", description: "Authentic Arabic coffee blends", sortOrder: 5, imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400" },
  { nameEn: "Gift Boxes", nameAr: "صناديق هدايا", slug: "gift-boxes", description: "Luxury gift boxes for all occasions", sortOrder: 6, imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400" },
  { nameEn: "Cold Sweets", nameAr: "حلويات باردة", slug: "cold-sweets", description: "Refreshing cold desserts and sweets", sortOrder: 7, imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400" },
  { nameEn: "Luxury Collection", nameAr: "المجموعة الفاخرة", slug: "luxury-collection", description: "Our finest premium selection", sortOrder: 8, imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400" },
];

console.log("  → Inserting categories...");
for (const cat of categories) {
  await db.execute(
    `INSERT INTO categories (nameEn, nameAr, slug, description, imageUrl, isActive, sortOrder)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE nameEn=VALUES(nameEn), nameAr=VALUES(nameAr)`,
    [cat.nameEn, cat.nameAr, cat.slug, cat.description, cat.imageUrl, cat.sortOrder]
  );
}

// Get category IDs
const [catRows] = await db.execute("SELECT id, slug FROM categories");
const catMap = {};
for (const c of catRows) catMap[c.slug] = c.id;

// ─── Products ─────────────────────────────────────────────────────────────────
const products = [
  {
    categorySlug: "arabic-sweets",
    nameEn: "Mix مشكل",
    nameAr: "مشكل",
    slug: "mix-mushakkal",
    descriptionEn: "A delightful assortment of our finest handcrafted Arabic sweets, perfect for sharing.",
    basePrice: "55.00",
    comparePrice: "70.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 50,
    weight: "250g",
    tags: "mix,assorted,popular",
  },
  {
    categorySlug: "arabic-sweets",
    nameEn: "Maamoul معمول",
    nameAr: "معمول",
    slug: "maamoul",
    descriptionEn: "Traditional Maamoul cookies filled with dates, walnuts, or pistachios. A timeless classic.",
    basePrice: "65.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 40,
    weight: "500g",
    tags: "maamoul,traditional,dates",
  },
  {
    categorySlug: "arabic-sweets",
    nameEn: "Ain Almaha عين المها",
    nameAr: "عين المها",
    slug: "ain-almaha",
    descriptionEn: "Elegant gazelle eye pastries with a delicate almond filling, dusted with powdered sugar.",
    basePrice: "50.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 35,
    weight: "250g",
    tags: "pastry,almond,elegant",
  },
  {
    categorySlug: "arabic-sweets",
    nameEn: "Rangenah رنجينة",
    nameAr: "رنجينة",
    slug: "rangenah",
    descriptionEn: "A traditional Emirati sweet made with dates and sesame, drizzled with tahini.",
    basePrice: "40.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600"]),
    isFeatured: 0,
    isGlutenFree: 1,
    isSugarFree: 0,
    stockQty: 30,
    weight: "300g",
    tags: "emirati,dates,sesame",
  },
  {
    categorySlug: "arabic-sweets",
    nameEn: "Cardamom Graibah غريبة الهيل",
    nameAr: "غريبة الهيل",
    slug: "cardamom-graibah",
    descriptionEn: "Melt-in-your-mouth shortbread cookies infused with aromatic cardamom.",
    basePrice: "65.00",
    comparePrice: "75.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 45,
    weight: "400g",
    tags: "cardamom,shortbread,aromatic",
  },
  {
    categorySlug: "gift-boxes",
    nameEn: "Tameriah Box تمرية",
    nameAr: "تمرية",
    slug: "tameriah-box",
    descriptionEn: "A luxurious gift box filled with premium Medjool dates and assorted Arabic sweets.",
    basePrice: "50.00",
    comparePrice: "80.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 25,
    weight: "500g",
    tags: "gift,dates,luxury,box",
  },
  {
    categorySlug: "arabic-sweets",
    nameEn: "Petit Four بيتيفور",
    nameAr: "بيتيفور",
    slug: "petit-four",
    descriptionEn: "Elegant bite-sized French-inspired pastries with an Arabic twist.",
    basePrice: "55.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600"]),
    isFeatured: 0,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 40,
    weight: "300g",
    tags: "petitfour,elegant,french",
  },
  {
    categorySlug: "gluten-free",
    nameEn: "Oats Lite شوفان لايت",
    nameAr: "شوفان لايت",
    slug: "oats-lite",
    descriptionEn: "Wholesome oat-based treats, light and nutritious, perfect for health-conscious sweet lovers.",
    basePrice: "50.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600"]),
    isFeatured: 0,
    isGlutenFree: 1,
    isSugarFree: 0,
    stockQty: 60,
    weight: "400g",
    tags: "oats,healthy,glutenfree",
  },
  {
    categorySlug: "arabic-sweets",
    nameEn: "Palestinian Kaeak كعك فلسطيني",
    nameAr: "كعك فلسطيني",
    slug: "palestinian-kaeak",
    descriptionEn: "Authentic Palestinian ring-shaped cookies with sesame seeds and aromatic spices.",
    basePrice: "50.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600"]),
    isFeatured: 0,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 35,
    weight: "500g",
    tags: "kaeak,palestinian,sesame",
  },
  {
    categorySlug: "gift-boxes",
    nameEn: "Zouza Box عين جمل",
    nameAr: "عين جمل",
    slug: "zouza-box",
    descriptionEn: "Beautifully presented gift box featuring our signature walnut-filled sweets.",
    basePrice: "55.00",
    comparePrice: "70.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 20,
    weight: "400g",
    tags: "gift,walnut,box,elegant",
  },
  {
    categorySlug: "nuts",
    nameEn: "Premium Mixed Nuts",
    nameAr: "مكسرات مشكلة فاخرة",
    slug: "premium-mixed-nuts",
    descriptionEn: "A premium selection of roasted cashews, almonds, pistachios, and walnuts.",
    basePrice: "75.00",
    comparePrice: "90.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600"]),
    isFeatured: 1,
    isGlutenFree: 1,
    isSugarFree: 1,
    stockQty: 80,
    weight: "500g",
    tags: "nuts,premium,healthy",
  },
  {
    categorySlug: "arabic-coffee",
    nameEn: "Arabic Coffee Blend",
    nameAr: "قهوة عربية",
    slug: "arabic-coffee-blend",
    descriptionEn: "Authentic Emirati Arabic coffee with cardamom and saffron. A traditional welcome drink.",
    basePrice: "45.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600"]),
    isFeatured: 1,
    isGlutenFree: 1,
    isSugarFree: 1,
    stockQty: 100,
    weight: "250g",
    tags: "coffee,arabic,cardamom,saffron",
  },
  {
    categorySlug: "luxury-collection",
    nameEn: "Royal Dates Collection",
    nameAr: "مجموعة التمور الملكية",
    slug: "royal-dates-collection",
    descriptionEn: "Our most exclusive collection featuring Medjool, Sukkari, and Ajwa dates in a handcrafted wooden box.",
    basePrice: "150.00",
    comparePrice: "200.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]),
    isFeatured: 1,
    isGlutenFree: 1,
    isSugarFree: 1,
    stockQty: 15,
    weight: "1kg",
    tags: "dates,luxury,medjool,royal,gift",
  },
  {
    categorySlug: "sugar-free",
    nameEn: "Sugar Free Maamoul",
    nameAr: "معمول بدون سكر",
    slug: "sugar-free-maamoul",
    descriptionEn: "All the authentic taste of traditional Maamoul, made without added sugar for diabetics.",
    basePrice: "70.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=600"]),
    isFeatured: 0,
    isGlutenFree: 0,
    isSugarFree: 1,
    stockQty: 30,
    weight: "400g",
    tags: "sugarfree,maamoul,diabetic",
  },
  {
    categorySlug: "cold-sweets",
    nameEn: "Date Ice Cream Sandwich",
    nameAr: "ساندويش آيس كريم بالتمر",
    slug: "date-ice-cream-sandwich",
    descriptionEn: "Creamy date-flavored ice cream between two crispy wafers. A modern Emirati treat.",
    basePrice: "35.00",
    comparePrice: null,
    images: JSON.stringify(["https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600"]),
    isFeatured: 0,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 50,
    weight: "200g",
    tags: "icecream,dates,cold,modern",
  },
  {
    categorySlug: "luxury-collection",
    nameEn: "Ramadan Gift Hamper",
    nameAr: "سلة رمضان الفاخرة",
    slug: "ramadan-gift-hamper",
    descriptionEn: "A magnificent Ramadan hamper with dates, Arabic sweets, nuts, and premium Arabic coffee.",
    basePrice: "250.00",
    comparePrice: "320.00",
    images: JSON.stringify(["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600"]),
    isFeatured: 1,
    isGlutenFree: 0,
    isSugarFree: 0,
    stockQty: 10,
    weight: "2kg",
    tags: "ramadan,hamper,luxury,gift,dates",
  },
];

console.log("  → Inserting products...");
for (const p of products) {
  const catId = catMap[p.categorySlug] || 1;
  await db.execute(
    `INSERT INTO products (categoryId, nameEn, nameAr, slug, descriptionEn, basePrice, comparePrice, images, isActive, isFeatured, isGlutenFree, isSugarFree, stockQty, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nameEn=VALUES(nameEn), basePrice=VALUES(basePrice), isFeatured=VALUES(isFeatured)`,
    [catId, p.nameEn, p.nameAr, p.slug, p.descriptionEn, p.basePrice, p.comparePrice, p.images, p.isFeatured, p.isGlutenFree, p.isSugarFree, p.stockQty, p.tags]
  );
}

// ─── Product Variants ─────────────────────────────────────────────────────────
const [prodRows] = await db.execute("SELECT id, slug FROM products");
const prodMap = {};
for (const p of prodRows) prodMap[p.slug] = p.id;

const variants = [
  { productSlug: "mix-mushakkal", label: "250g", price: "55.00", stockQty: 30 },
  { productSlug: "mix-mushakkal", label: "500g", price: "75.00", stockQty: 25 },
  { productSlug: "mix-mushakkal", label: "1kg", price: "90.00", stockQty: 15 },
  { productSlug: "maamoul", label: "250g", price: "65.00", stockQty: 25 },
  { productSlug: "maamoul", label: "500g", price: "110.00", stockQty: 20 },
  { productSlug: "tameriah-box", label: "Small (500g)", price: "50.00", stockQty: 15 },
  { productSlug: "tameriah-box", label: "Large (1kg)", price: "100.00", stockQty: 10 },
  { productSlug: "oats-lite", label: "400g", price: "50.00", stockQty: 40 },
  { productSlug: "oats-lite", label: "800g", price: "80.00", stockQty: 20 },
];

console.log("  → Inserting product variants...");
for (const v of variants) {
  const productId = prodMap[v.productSlug];
  if (!productId) continue;
  await db.execute(
    `INSERT INTO product_variants (productId, nameEn, nameAr, price, stockQty)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE price=VALUES(price), stockQty=VALUES(stockQty)`,
    [productId, v.label, v.label, v.price, v.stockQty]
  );
}

// ─── Coupons ──────────────────────────────────────────────────────────────────
const coupons = [
  { code: "WELCOME10", type: "percentage", value: "10.00", minOrderAmount: "100.00", maxUses: 100, isActive: 1 },
  { code: "RAMADAN20", type: "percentage", value: "20.00", minOrderAmount: "200.00", maxUses: 50, isActive: 1 },
  { code: "FLAT25", type: "fixed", value: "25.00", minOrderAmount: "150.00", maxUses: 200, isActive: 1 },
];

console.log("  → Inserting coupons...");
for (const c of coupons) {
  await db.execute(
    `INSERT INTO coupons (code, type, value, minOrderAmount, maxUses, isActive)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value=VALUES(value), isActive=VALUES(isActive)`,
    [c.code, c.type, c.value, c.minOrderAmount, c.maxUses, c.isActive]
  );
}

// ─── Store Settings ───────────────────────────────────────────────────────────
const settings = [
  ["store_name", "Dates & Wheat | تمر وقمح"],
  ["store_email", "admin@datesandwheat.com"],
  ["store_phone", "+971 92237070"],
  ["store_address", "Fujairah – Madab – Front KM Trading, Fujairah, UAE"],
  ["store_whatsapp", "+971 92237070"],
  ["free_shipping_threshold", "200"],
  ["shipping_fee", "25"],
  ["vat_rate", "5"],
  ["currency", "AED"],
  ["meta_title", "Dates & Wheat | Premium Arabic Sweets – Fujairah, UAE"],
  ["meta_description", "Handcrafted Arabic sweets, Maamoul, gluten-free confectionery, nuts, and luxury gift boxes. Founded 1990 in Fujairah, UAE."],
  ["instagram", "https://instagram.com/datesandwheat"],
  ["facebook", "https://facebook.com/datesandwheat"],
  ["tiktok", "https://tiktok.com/@datesandwheat"],
];

console.log("  → Inserting store settings...");
for (const [key, value] of settings) {
  await db.execute(
    `INSERT INTO store_settings (\`key\`, value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value=VALUES(value)`,
    [key, value]
  );
}

// ─── Admin User ───────────────────────────────────────────────────────────────
console.log("  → Creating admin user...");
await db.execute(
  `INSERT INTO users (openId, name, email, role, loginMethod)
   VALUES ('admin-datesandwheat', 'Admin', 'admin@datesandwheat.com', 'admin', 'email')
   ON DUPLICATE KEY UPDATE role='admin'`
);

await db.end();
console.log("✅ Database seeded successfully!");
console.log("   Categories: " + categories.length);
console.log("   Products: " + products.length);
console.log("   Variants: " + variants.length);
console.log("   Coupons: " + coupons.length);
