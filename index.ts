import express, { Request, Response, NextFunction } from "express";
import Database from "better-sqlite3";
import cors from "cors";

const app = express();
const db = new Database("data.db");

app.use(cors());
app.use(express.json());

// =============================================================================
// AUTH MOCK
// =============================================================================

const FAKE_TOKEN_PREFIX = "fake-token-";

function generateToken(userId: string): string {
  return `${FAKE_TOKEN_PREFIX}${userId}`;
}

function extractUserId(token: string): string | null {
  if (token.startsWith(FAKE_TOKEN_PREFIX)) {
    return token.replace(FAKE_TOKEN_PREFIX, "");
  }
  return null;
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");
  const userId = extractUserId(token);

  if (!userId) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(userId);

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  (req as any).user = user;
  next();
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

interface ValidationError {
  field: string;
  message: string;
}

function validateString(
  value: any,
  field: string,
  options: { required?: boolean; minLength?: number; maxLength?: number } = {}
): ValidationError | null {
  const { required = true, minLength = 1, maxLength = 500 } = options;

  if (value === undefined || value === null || value === "") {
    if (required) {
      return { field, message: `${field} is required` };
    }
    return null;
  }

  if (typeof value !== "string") {
    return { field, message: `${field} must be a string` };
  }

  if (value.length < minLength) {
    return { field, message: `${field} must be at least ${minLength} characters` };
  }

  if (value.length > maxLength) {
    return { field, message: `${field} must be at most ${maxLength} characters` };
  }

  return null;
}

function validateNumber(
  value: any,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {}
): ValidationError | null {
  const { required = true, min, max } = options;

  if (value === undefined || value === null || value === "") {
    if (required) {
      return { field, message: `${field} is required` };
    }
    return null;
  }

  if (typeof value !== "number" || isNaN(value)) {
    return { field, message: `${field} must be a number` };
  }

  if (min !== undefined && value < min) {
    return { field, message: `${field} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { field, message: `${field} must be at most ${max}` };
  }

  return null;
}

function validateEmail(value: any, field: string): ValidationError | null {
  const stringError = validateString(value, field, { maxLength: 255 });
  if (stringError) return stringError;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { field, message: `${field} must be a valid email address` };
  }

  return null;
}

function collectErrors(errors: (ValidationError | null)[]): ValidationError[] {
  return errors.filter((e): e is ValidationError => e !== null);
}

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

app.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  const errors = collectErrors([
    validateEmail(email, "email"),
    validateString(password, "password", { minLength: 1 }),
  ]);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const user = db
    .prepare("SELECT id, email, name, password FROM users WHERE email = ?")
    .get(email) as any;

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

app.get("/auth/me", authMiddleware, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

// =============================================================================
// ITEMS ENDPOINTS
// =============================================================================

app.get("/items", authMiddleware, (req: Request, res: Response) => {
  const { search, category } = req.query;

  let query = "SELECT * FROM items WHERE 1=1";
  const params: any[] = [];

  if (search && typeof search === "string") {
    query += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && typeof category === "string") {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY createdAt DESC";

  const items = db.prepare(query).all(...params);
  res.json({ items });
});

app.get("/items/:id", authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  const ratings = db.prepare("SELECT * FROM ratings WHERE itemId = ? ORDER BY createdAt DESC").all(id);

  res.json({ item, ratings });
});

app.post("/items", authMiddleware, (req: Request, res: Response) => {
  const { name, description, imageUrl, category, year } = req.body;

  const errors = collectErrors([
    validateString(name, "name", { minLength: 2, maxLength: 200 }),
    validateString(description, "description", { required: false, maxLength: 2000 }),
    validateString(imageUrl, "imageUrl", { required: false, maxLength: 500 }),
    validateString(category, "category", { required: false, maxLength: 100 }),
    validateNumber(year, "year", { required: false, min: 1900, max: 2100 }),
  ]);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const id = `item-${Date.now()}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO items (id, name, description, imageUrl, category, year, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || "", imageUrl || "", category || "", year || null, createdAt);

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  res.status(201).json({ item });
});

app.put("/items/:id", authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, imageUrl, category, year } = req.body;

  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(id);

  if (!existing) {
    return res.status(404).json({ error: "Item not found" });
  }

  const errors = collectErrors([
    validateString(name, "name", { minLength: 2, maxLength: 200 }),
    validateString(description, "description", { required: false, maxLength: 2000 }),
    validateString(imageUrl, "imageUrl", { required: false, maxLength: 500 }),
    validateString(category, "category", { required: false, maxLength: 100 }),
    validateNumber(year, "year", { required: false, min: 1900, max: 2100 }),
  ]);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  db.prepare(`
    UPDATE items SET name = ?, description = ?, imageUrl = ?, category = ?, year = ?
    WHERE id = ?
  `).run(name, description || "", imageUrl || "", category || "", year || null, id);

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  res.json({ item });
});

app.delete("/items/:id", authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(id);

  if (!existing) {
    return res.status(404).json({ error: "Item not found" });
  }

  db.prepare("DELETE FROM ratings WHERE itemId = ?").run(id);
  db.prepare("DELETE FROM items WHERE id = ?").run(id);

  res.status(204).send();
});

// =============================================================================
// RATINGS ENDPOINTS
// =============================================================================

app.get("/items/:itemId/ratings", authMiddleware, (req: Request, res: Response) => {
  const { itemId } = req.params;

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  const ratings = db.prepare("SELECT * FROM ratings WHERE itemId = ? ORDER BY createdAt DESC").all(itemId);
  res.json({ ratings });
});

app.post("/items/:itemId/ratings", authMiddleware, (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { score, comment } = req.body;
  const user = (req as any).user;

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  const errors = collectErrors([
    validateNumber(score, "score", { min: 1, max: 5 }),
    validateString(comment, "comment", { required: false, maxLength: 1000 }),
  ]);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const id = `rating-${Date.now()}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO ratings (id, itemId, userId, score, comment, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, itemId, user.id, score, comment || "", createdAt);

  const rating = db.prepare("SELECT * FROM ratings WHERE id = ?").get(id);
  res.status(201).json({ rating });
});

app.delete("/ratings/:id", authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const rating = db.prepare("SELECT * FROM ratings WHERE id = ?").get(id) as any;

  if (!rating) {
    return res.status(404).json({ error: "Rating not found" });
  }

  if (rating.userId !== user.id) {
    return res.status(403).json({ error: "You can only delete your own ratings" });
  }

  db.prepare("DELETE FROM ratings WHERE id = ?").run(id);

  res.status(204).send();
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}`);
});
