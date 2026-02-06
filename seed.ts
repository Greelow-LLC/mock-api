import Database from "better-sqlite3";

const db = new Database("data.db");

// =============================================================================
// CREATE TABLES
// =============================================================================

console.log("Creating tables...");

db.exec(`
  DROP TABLE IF EXISTS ratings;
  DROP TABLE IF EXISTS items;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    imageUrl TEXT,
    category TEXT,
    year INTEGER,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE ratings (
    id TEXT PRIMARY KEY,
    itemId TEXT NOT NULL,
    userId TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (itemId) REFERENCES items(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE INDEX idx_items_category ON items(category);
  CREATE INDEX idx_ratings_itemId ON ratings(itemId);
  CREATE INDEX idx_ratings_userId ON ratings(userId);
`);

console.log("Tables created.");

// =============================================================================
// SEED DATA
// =============================================================================

console.log("Seeding data...");

// Users
const users = [
  { id: "user-1", email: "demo@example.com", name: "Usuario Demo", password: "demo123" },
  { id: "user-2", email: "test@example.com", name: "Test User", password: "test123" },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)
`);

for (const user of users) {
  insertUser.run(user.id, user.email, user.name, user.password);
}

console.log(`Inserted ${users.length} users.`);

// Items (generic names - the candidate gives them meaning)
const items = [
  {
    id: "item-1",
    name: "Item de ejemplo 1",
    description: "Esta es la descripcion del primer item de ejemplo. Podés usarlo como quieras.",
    imageUrl: "https://picsum.photos/seed/item1/300/200",
    category: "categoria-a",
    year: 2024,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "item-2",
    name: "Item de ejemplo 2",
    description: "Otro item de ejemplo para que pruebes la aplicacion.",
    imageUrl: "https://picsum.photos/seed/item2/300/200",
    category: "categoria-b",
    year: 2023,
    createdAt: "2024-02-20T14:30:00Z",
  },
  {
    id: "item-3",
    name: "Item de ejemplo 3",
    description: "Un tercer item con otra categoria.",
    imageUrl: "https://picsum.photos/seed/item3/300/200",
    category: "categoria-a",
    year: 2022,
    createdAt: "2024-03-10T09:15:00Z",
  },
  {
    id: "item-4",
    name: "Item de ejemplo 4",
    description: "Cuarto item para tener mas datos de prueba.",
    imageUrl: "https://picsum.photos/seed/item4/300/200",
    category: "categoria-c",
    year: 2024,
    createdAt: "2024-04-05T16:45:00Z",
  },
  {
    id: "item-5",
    name: "Item de ejemplo 5",
    description: "El quinto y ultimo item de ejemplo.",
    imageUrl: "https://picsum.photos/seed/item5/300/200",
    category: "categoria-b",
    year: 2021,
    createdAt: "2024-05-01T11:00:00Z",
  },
];

const insertItem = db.prepare(`
  INSERT INTO items (id, name, description, imageUrl, category, year, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const item of items) {
  insertItem.run(item.id, item.name, item.description, item.imageUrl, item.category, item.year, item.createdAt);
}

console.log(`Inserted ${items.length} items.`);

// Ratings
const ratings = [
  {
    id: "rating-1",
    itemId: "item-1",
    userId: "user-1",
    score: 4,
    comment: "Muy bueno, lo recomiendo.",
    createdAt: "2024-03-01T09:00:00Z",
  },
  {
    id: "rating-2",
    itemId: "item-1",
    userId: "user-2",
    score: 5,
    comment: "Excelente!",
    createdAt: "2024-03-02T10:30:00Z",
  },
  {
    id: "rating-3",
    itemId: "item-2",
    userId: "user-1",
    score: 3,
    comment: "Esta bien, pero podria ser mejor.",
    createdAt: "2024-03-05T14:00:00Z",
  },
  {
    id: "rating-4",
    itemId: "item-3",
    userId: "user-2",
    score: 2,
    comment: "No me convencio.",
    createdAt: "2024-03-10T16:20:00Z",
  },
  {
    id: "rating-5",
    itemId: "item-4",
    userId: "user-1",
    score: 5,
    comment: "Increible, de lo mejor que vi.",
    createdAt: "2024-04-15T08:45:00Z",
  },
];

const insertRating = db.prepare(`
  INSERT INTO ratings (id, itemId, userId, score, comment, createdAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const rating of ratings) {
  insertRating.run(rating.id, rating.itemId, rating.userId, rating.score, rating.comment, rating.createdAt);
}

console.log(`Inserted ${ratings.length} ratings.`);

// =============================================================================
// DONE
// =============================================================================

console.log("\nSeed completed successfully!");
console.log("\nTest credentials:");
console.log("  Email: demo@example.com");
console.log("  Password: demo123");
