const express = require("express");
const { createHttpError } = require("./lib/http-error");
const requestContext = require("./middleware/request-context");
const requestLogger = require("./middleware/request-logger");
const ordersRouter = require("./modules/orders/orders.routes");
const productsRouter = require("./modules/products/products.routes");

const app = express();

app.use(requestContext);
app.use(requestLogger);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

app.use((req, res, next) => {
  next(createHttpError(404, "NOT_FOUND", "Resource not found."));
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message =
    status === 500 ? "Internal server error." : err.message;

  res.status(status).json({
    error: {
      code,
      message,
    },
    requestId: req.requestId,
  });
});

module.exports = app;
