const express = require("express");
const ordersRouter = require("./modules/orders/orders.routes");
const productsRouter = require("./modules/products/products.routes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

module.exports = app;
