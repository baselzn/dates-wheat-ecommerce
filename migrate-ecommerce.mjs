import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("No DATABASE_URL"); process.exit(1); }

// Parse mysql URL
const url = new URL(DB_URL.replace("mysql://", "http://"));
const [user, password] = url.username ? [decodeURIComponent(url.username), decodeURIComponent(url.password)] : [null, null];
const sslParam = url.searchParams.get("ssl");

const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user,
  password,
  database: url.pathname.replace("/", ""),
  ssl: sslParam ? { rejectUnauthorized: true } : undefined,
  multipleStatements: true,
});

const tables = [
  `CREATE TABLE IF NOT EXISTS wishlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    productId INT NOT NULL,
    variantId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS flash_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    nameAr VARCHAR(128),
    discountType ENUM('percentage','fixed') NOT NULL,
    discountValue DECIMAL(10,2) NOT NULL,
    startsAt TIMESTAMP NOT NULL,
    endsAt TIMESTAMP NOT NULL,
    isActive BOOLEAN DEFAULT TRUE NOT NULL,
    bannerText VARCHAR(256),
    bannerTextAr VARCHAR(256),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flash_sale_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flashSaleId INT NOT NULL,
    productId INT NOT NULL,
    overrideDiscount DECIMAL(10,2),
    FOREIGN KEY (flashSaleId) REFERENCES flash_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS product_bundles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    nameAr VARCHAR(128),
    description TEXT,
    descriptionAr TEXT,
    slug VARCHAR(160) NOT NULL UNIQUE,
    imageUrl VARCHAR(512),
    originalPrice DECIMAL(10,2) NOT NULL,
    bundlePrice DECIMAL(10,2) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE NOT NULL,
    stockLimit INT,
    soldCount INT DEFAULT 0 NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS product_bundle_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bundleId INT NOT NULL,
    productId INT NOT NULL,
    variantId INT,
    quantity INT DEFAULT 1 NOT NULL,
    FOREIGN KEY (bundleId) REFERENCES product_bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS product_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    userId INT,
    guestName VARCHAR(128),
    guestEmail VARCHAR(256),
    question TEXT NOT NULL,
    answer TEXT,
    answeredBy INT,
    answeredAt TIMESTAMP NULL,
    isPublished BOOLEAN DEFAULT FALSE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS loyalty_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    points INT NOT NULL,
    type ENUM('earned_order','earned_review','earned_referral','redeemed','expired','manual_adjust') NOT NULL,
    refType VARCHAR(64),
    refId INT,
    description VARCHAR(256),
    expiresAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS loyalty_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(64) NOT NULL UNIQUE,
    value TEXT,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS abandoned_carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    guestEmail VARCHAR(256),
    cartSnapshot TEXT NOT NULL,
    totalValue DECIMAL(10,2) NOT NULL,
    reminderSentAt TIMESTAMP NULL,
    recoveredAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_tracking_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    status VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    titleAr VARCHAR(256),
    description TEXT,
    location VARCHAR(256),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    createdBy INT,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS recently_viewed (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    productId INT NOT NULL,
    viewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS review_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reviewId INT NOT NULL,
    userId INT NOT NULL,
    vote ENUM('helpful','not_helpful') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS feature_flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature VARCHAR(64) NOT NULL UNIQUE,
    isEnabled BOOLEAN DEFAULT TRUE NOT NULL,
    config TEXT,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedBy INT
  )`,
  `CREATE TABLE IF NOT EXISTS referral_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    usedCount INT DEFAULT 0 NOT NULL,
    isActive BOOLEAN DEFAULT TRUE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS referral_uses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referralCodeId INT NOT NULL,
    referredUserId INT NOT NULL,
    orderId INT,
    pointsAwarded INT DEFAULT 0 NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (referralCodeId) REFERENCES referral_codes(id),
    FOREIGN KEY (referredUserId) REFERENCES users(id)
  )`,
];

// Seed default feature flags
const defaultFlags = [
  "wishlist", "flash_sales", "product_bundles", "product_qa",
  "loyalty_points", "abandoned_cart_recovery", "order_tracking",
  "recently_viewed", "review_voting", "referral_program",
  "product_search", "product_comparison", "social_sharing"
];

console.log("Creating new e-commerce tables...");
let created = 0, skipped = 0;
for (const sql of tables) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`  ✓ ${tableName}`);
    created++;
  } catch (e) {
    console.log(`  ✗ ${tableName}: ${e.message}`);
    skipped++;
  }
}

// Seed feature flags
console.log("\nSeeding default feature flags...");
for (const flag of defaultFlags) {
  try {
    await conn.execute(
      "INSERT IGNORE INTO feature_flags (feature, isEnabled) VALUES (?, ?)",
      [flag, true]
    );
  } catch (e) {
    // ignore
  }
}

// Seed default loyalty settings
const loyaltyDefaults = [
  ["points_per_aed", "1"],         // 1 point per AED spent
  ["aed_per_point", "0.05"],       // 1 point = 0.05 AED
  ["min_redeem_points", "100"],    // minimum 100 points to redeem
  ["expiry_days", "365"],          // points expire after 1 year
  ["enabled", "true"],
  ["referral_points_referrer", "50"],   // points for referrer
  ["referral_points_referee", "25"],    // points for new user
];
for (const [key, value] of loyaltyDefaults) {
  try {
    await conn.execute(
      "INSERT IGNORE INTO loyalty_settings (`key`, value) VALUES (?, ?)",
      [key, value]
    );
  } catch (e) { /* ignore */ }
}
console.log("  ✓ Loyalty settings seeded");

await conn.end();
console.log(`\nDone! Created ${created} tables, ${skipped} skipped.`);
