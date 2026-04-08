const assert = require("node:assert/strict");
const test = require("node:test");
const request = require("supertest");

process.env.DATABASE_URL = "file:./test.db";

const app = require("../src/app");
const prisma = require("../src/lib/prisma");

test.beforeEach(async () => {
  await prisma.product.deleteMany();
});

test.after(async () => {
  await prisma.$disconnect();
});

test("GET /health returns ok", async () => {
  const response = await request(app).get("/health").expect(200);

  assert.deepEqual(response.body, { status: "ok" });
});

test("GET /products returns products", async () => {
  await prisma.product.create({
    data: {
      name: "Test Product",
      price: 1000,
      stock: 5,
    },
  });

  const response = await request(app).get("/products").expect(200);

  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].name, "Test Product");
  assert.equal(response.body[0].price, 1000);
  assert.equal(response.body[0].stock, 5);
});

test("POST /products creates a product", async () => {
  const response = await request(app)
    .post("/products")
    .send({
      name: "Created Product",
      price: 1200,
      stock: 10,
    })
    .expect(201);

  assert.equal(response.body.name, "Created Product");
  assert.equal(response.body.price, 1200);
  assert.equal(response.body.stock, 10);

  const products = await prisma.product.findMany();
  assert.equal(products.length, 1);
});

test("POST /products rejects invalid input", async () => {
  const response = await request(app)
    .post("/products")
    .send({
      name: "Invalid Product",
      price: "1200",
      stock: 10,
    })
    .expect(400);

  assert.equal(
    response.body.message,
    "name, price, and stock are required. price and stock must be numbers.",
  );

  const products = await prisma.product.findMany();
  assert.equal(products.length, 0);
});

test("POST /products rejects invalid stock", async () => {
  const response = await request(app)
    .post("/products")
    .send({
      name: "Invalid Product",
      price: 1200,
      stock: "10",
    })
    .expect(400);

  assert.equal(
    response.body.message,
    "name, price, and stock are required. price and stock must be numbers.",
  );

  const products = await prisma.product.findMany();
  assert.equal(products.length, 0);
});
