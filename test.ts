const BASE_URL = "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function api(
  method: string,
  path: string,
  options: { body?: any; token?: string } = {}
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

// =============================================================================
// TESTS
// =============================================================================

async function runTests() {
  console.log("\n🧪 Running API tests...\n");

  const TOKEN_USER_1 = "fake-token-user-1";
  const TOKEN_USER_2 = "fake-token-user-2";
  let createdItemId: string;
  let createdRatingId: string;

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------

  await test("POST /auth/login - user 1 success", async () => {
    const { status, data } = await api("POST", "/auth/login", {
      body: { email: "demo@example.com", password: "demo123" },
    });
    assertEqual(status, 200, "status");
    assertEqual(data.token, TOKEN_USER_1, "token");
    assertEqual(data.user.email, "demo@example.com", "email");
  });

  await test("POST /auth/login - user 2 success", async () => {
    const { status, data } = await api("POST", "/auth/login", {
      body: { email: "test@example.com", password: "test123" },
    });
    assertEqual(status, 200, "status");
    assertEqual(data.token, TOKEN_USER_2, "token");
    assertEqual(data.user.email, "test@example.com", "email");
  });

  await test("POST /auth/login - invalid credentials", async () => {
    const { status, data } = await api("POST", "/auth/login", {
      body: { email: "wrong@example.com", password: "wrong" },
    });
    assertEqual(status, 401, "status");
    assert(data.error !== undefined, "should have error");
  });

  await test("POST /auth/login - validation error", async () => {
    const { status, data } = await api("POST", "/auth/login", {
      body: { email: "not-an-email", password: "" },
    });
    assertEqual(status, 400, "status");
    assert(Array.isArray(data.errors), "should have errors array");
  });

  await test("GET /auth/me - success", async () => {
    const { status, data } = await api("GET", "/auth/me", { token: TOKEN_USER_1 });
    assertEqual(status, 200, "status");
    assertEqual(data.user.id, "user-1", "user id");
  });

  await test("GET /auth/me - no token", async () => {
    const { status } = await api("GET", "/auth/me");
    assertEqual(status, 401, "status");
  });

  await test("GET /auth/me - invalid token", async () => {
    const { status } = await api("GET", "/auth/me", { token: "invalid-token" });
    assertEqual(status, 401, "status");
  });

  // ---------------------------------------------------------------------------
  // ITEMS - READ
  // ---------------------------------------------------------------------------

  await test("GET /items - list all", async () => {
    const { status, data } = await api("GET", "/items", { token: TOKEN_USER_1 });
    assertEqual(status, 200, "status");
    assert(Array.isArray(data.items), "should have items array");
    assert(data.items.length >= 5, "should have at least 5 items");
  });

  await test("GET /items?search - filter by search", async () => {
    const { status, data } = await api("GET", "/items?search=ejemplo%201", { token: TOKEN_USER_1 });
    assertEqual(status, 200, "status");
    assert(data.items.length >= 1, "should find at least 1 item");
    assert(data.items[0].name.includes("1"), "should match search");
  });

  await test("GET /items?category - filter by category", async () => {
    const { status, data } = await api("GET", "/items?category=categoria-a", { token: TOKEN_USER_1 });
    assertEqual(status, 200, "status");
    assert(data.items.length >= 1, "should find items");
    assert(data.items.every((i: any) => i.category === "categoria-a"), "all should be categoria-a");
  });

  await test("GET /items/:id - get single item", async () => {
    const { status, data } = await api("GET", "/items/item-1", { token: TOKEN_USER_1 });
    assertEqual(status, 200, "status");
    assertEqual(data.item.id, "item-1", "item id");
    assert(Array.isArray(data.ratings), "should include ratings");
  });

  await test("GET /items/:id - not found", async () => {
    const { status, data } = await api("GET", "/items/item-999", { token: TOKEN_USER_1 });
    assertEqual(status, 404, "status");
    assert(data.error !== undefined, "should have error");
  });

  // ---------------------------------------------------------------------------
  // ITEMS - CREATE
  // ---------------------------------------------------------------------------

  await test("POST /items - create item", async () => {
    const { status, data } = await api("POST", "/items", {
      token: TOKEN_USER_1,
      body: {
        name: "Test Item",
        description: "Created by test",
        category: "test-category",
        year: 2025,
      },
    });
    assertEqual(status, 201, "status");
    assert(data.item.id !== undefined, "should have id");
    assertEqual(data.item.name, "Test Item", "name");
    createdItemId = data.item.id;
  });

  await test("POST /items - validation error (name too short)", async () => {
    const { status, data } = await api("POST", "/items", {
      token: TOKEN_USER_1,
      body: { name: "a" },
    });
    assertEqual(status, 400, "status");
    assert(data.errors.some((e: any) => e.field === "name"), "should have name error");
  });

  await test("POST /items - validation error (year out of range)", async () => {
    const { status, data } = await api("POST", "/items", {
      token: TOKEN_USER_1,
      body: { name: "Valid Name", year: 1800 },
    });
    assertEqual(status, 400, "status");
    assert(data.errors.some((e: any) => e.field === "year"), "should have year error");
  });

  // ---------------------------------------------------------------------------
  // ITEMS - UPDATE
  // ---------------------------------------------------------------------------

  await test("PUT /items/:id - update item", async () => {
    const { status, data } = await api("PUT", `/items/${createdItemId}`, {
      token: TOKEN_USER_1,
      body: {
        name: "Updated Test Item",
        description: "Updated by test",
        category: "updated-category",
        year: 2026,
      },
    });
    assertEqual(status, 200, "status");
    assertEqual(data.item.name, "Updated Test Item", "name");
    assertEqual(data.item.category, "updated-category", "category");
  });

  await test("PUT /items/:id - not found", async () => {
    const { status } = await api("PUT", "/items/item-999", {
      token: TOKEN_USER_1,
      body: { name: "Test" },
    });
    assertEqual(status, 404, "status");
  });

  // ---------------------------------------------------------------------------
  // RATINGS
  // ---------------------------------------------------------------------------

  await test("GET /items/:id/ratings - list ratings", async () => {
    const { status, data } = await api("GET", "/items/item-1/ratings", { token: TOKEN_USER_1 });
    assertEqual(status, 200, "status");
    assert(Array.isArray(data.ratings), "should have ratings array");
  });

  await test("POST /items/:id/ratings - create rating", async () => {
    const { status, data } = await api("POST", `/items/${createdItemId}/ratings`, {
      token: TOKEN_USER_1,
      body: { score: 5, comment: "Test rating" },
    });
    assertEqual(status, 201, "status");
    assertEqual(data.rating.score, 5, "score");
    createdRatingId = data.rating.id;
  });

  await test("POST /items/:id/ratings - validation error (score > 5)", async () => {
    const { status, data } = await api("POST", "/items/item-1/ratings", {
      token: TOKEN_USER_1,
      body: { score: 10 },
    });
    assertEqual(status, 400, "status");
    assert(data.errors.some((e: any) => e.field === "score"), "should have score error");
  });

  await test("POST /items/:id/ratings - validation error (score < 1)", async () => {
    const { status, data } = await api("POST", "/items/item-1/ratings", {
      token: TOKEN_USER_1,
      body: { score: 0 },
    });
    assertEqual(status, 400, "status");
    assert(data.errors.some((e: any) => e.field === "score"), "should have score error");
  });

  await test("POST /items/:id/ratings - item not found", async () => {
    const { status } = await api("POST", "/items/item-999/ratings", {
      token: TOKEN_USER_1,
      body: { score: 5 },
    });
    assertEqual(status, 404, "status");
  });

  await test("DELETE /ratings/:id - cannot delete other user's rating", async () => {
    const { status, data } = await api("DELETE", `/ratings/${createdRatingId}`, {
      token: TOKEN_USER_2,
    });
    assertEqual(status, 403, "status");
    assert(data.error !== undefined, "should have error");
  });

  await test("DELETE /ratings/:id - delete own rating", async () => {
    const { status } = await api("DELETE", `/ratings/${createdRatingId}`, {
      token: TOKEN_USER_1,
    });
    assertEqual(status, 204, "status");
  });

  await test("DELETE /ratings/:id - not found", async () => {
    const { status } = await api("DELETE", "/ratings/rating-999", {
      token: TOKEN_USER_1,
    });
    assertEqual(status, 404, "status");
  });

  // ---------------------------------------------------------------------------
  // ITEMS - DELETE
  // ---------------------------------------------------------------------------

  await test("DELETE /items/:id - delete item", async () => {
    const { status } = await api("DELETE", `/items/${createdItemId}`, {
      token: TOKEN_USER_1,
    });
    assertEqual(status, 204, "status");
  });

  await test("DELETE /items/:id - verify deleted", async () => {
    const { status } = await api("GET", `/items/${createdItemId}`, {
      token: TOKEN_USER_1,
    });
    assertEqual(status, 404, "status");
  });

  await test("DELETE /items/:id - not found", async () => {
    const { status } = await api("DELETE", "/items/item-999", {
      token: TOKEN_USER_1,
    });
    assertEqual(status, 404, "status");
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------

  console.log("\n" + "=".repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  if (failed === 0) {
    console.log(`\n✅ All ${passed} tests passed!\n`);
  } else {
    console.log(`\n❌ ${failed} tests failed, ${passed} passed\n`);
    console.log("Failed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
    console.log("");
    process.exit(1);
  }
}

// Run
runTests().catch((err) => {
  console.error("\n❌ Test suite crashed:", err.message);
  process.exit(1);
});
