const assert = require("node:assert/strict");
const test = require("node:test");
const request = require("supertest");

process.env.DATABASE_URL = "file:./test.db";

const app = require("../src/app");
const prisma = require("../src/lib/prisma");

test.beforeEach(async () => {
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
});

test.after(async () => {
  await prisma.$disconnect();
});

test("GET /orders returns orders", async () => {
  const product = await prisma.product.create({
    data: {
      name: "Ordered Product",
      price: 1000,
      stock: 5,
    },
  });

  await prisma.order.create({
    data: {
      productId: product.id,
      quantity: 2,
    },
  });

  const response = await request(app).get("/orders").expect(200);

  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].productId, product.id);
  assert.equal(response.body[0].quantity, 2);
  assert.equal(response.body[0].product.name, "Ordered Product");
});

test("POST /orders creates an order and decrements stock", async () => {
  const product = await prisma.product.create({
    data: {
      name: "Stocked Product",
      price: 1200,
      stock: 10,
    },
  });

  const response = await request(app)
    .post("/orders")
    .send({
      productId: product.id,
      quantity: 3,
    })
    .expect(201);

  assert.equal(response.body.productId, product.id);
  assert.equal(response.body.quantity, 3);
  assert.equal(response.body.product.stock, 7);

  const updatedProduct = await prisma.product.findUnique({
    where: { id: product.id },
  });
  assert.equal(updatedProduct.stock, 7);

  const orders = await prisma.order.findMany();
  assert.equal(orders.length, 1);
});

test("POST /orders returns 404 when product does not exist", async () => {
  const response = await request(app)
    .post("/orders")
    .send({
      productId: 9999,
      quantity: 1,
    })
    .expect(404);

  assert.equal(response.body.message, "Product not found.");

  const orders = await prisma.order.findMany();
  assert.equal(orders.length, 0);
});

test("POST /orders returns 400 when quantity is invalid", async () => {
  const product = await prisma.product.create({
    data: {
      name: "Invalid Quantity Product",
      price: 1200,
      stock: 10,
    },
  });

  const response = await request(app)
    .post("/orders")
    .send({
      productId: product.id,
      quantity: 0,
    })
    .expect(400);

  assert.equal(
    response.body.message,
    "productId and quantity are required. quantity must be a positive integer.",
  );

  const orders = await prisma.order.findMany();
  assert.equal(orders.length, 0);
});

test("POST /orders returns 409 when stock is insufficient", async () => {
  const product = await prisma.product.create({
    data: {
      name: "Low Stock Product",
      price: 1200,
      stock: 2,
    },
  });

  const response = await request(app)
    .post("/orders")
    .send({
      productId: product.id,
      quantity: 3,
    })
    .expect(409);

  assert.equal(response.body.message, "Insufficient stock.");

  const updatedProduct = await prisma.product.findUnique({
    where: { id: product.id },
  });
  assert.equal(updatedProduct.stock, 2);

  const orders = await prisma.order.findMany();
  assert.equal(orders.length, 0);
});

test("DELETE /orders/:id cancels an order and restores stock", async () => {
  const product = await prisma.product.create({
    data: {
      name: "Cancel Product",
      price: 1200,
      stock: 7,
    },
  });

  const order = await prisma.order.create({
    data: {
      productId: product.id,
      quantity: 3,
    },
  });

  const response = await request(app).delete(`/orders/${order.id}`).expect(200);

  assert.equal(response.body.id, order.id);
  assert.equal(response.body.productId, product.id);
  assert.equal(response.body.quantity, 3);

  const deletedOrder = await prisma.order.findUnique({
    where: { id: order.id },
  });
  assert.equal(deletedOrder, null);

  const updatedProduct = await prisma.product.findUnique({
    where: { id: product.id },
  });
  assert.equal(updatedProduct.stock, 10);
});

test("DELETE /orders/:id returns 404 when order does not exist", async () => {
  const response = await request(app).delete("/orders/9999").expect(404);

  assert.equal(response.body.message, "Order not found.");
});
