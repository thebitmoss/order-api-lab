const express = require("express");
const { createHttpError } = require("../../lib/http-error");
const { createRequestHash } = require("../../lib/idempotency");
const prisma = require("../../lib/prisma");

const router = express.Router();

async function createOrderWithInventory(tx, productId, quantity) {
  const product = await tx.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return { status: "not_found" };
  }

  const stockUpdate = await tx.product.updateMany({
    where: {
      id: productId,
      stock: {
        gte: quantity,
      },
    },
    data: {
      stock: {
        decrement: quantity,
      },
    },
  });

  if (stockUpdate.count === 0) {
    return { status: "insufficient_stock" };
  }

  const order = await tx.order.create({
    data: {
      productId,
      quantity,
    },
    include: {
      product: true,
    },
  });

  return { status: "created", order };
}

router.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        product: true,
      },
      orderBy: { id: "asc" },
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const idempotencyKey = req.get("Idempotency-Key");
  let ownedIdempotencyRecord = null;

  try {
    const { productId, quantity } = req.body;

    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return next(
        createHttpError(
          400,
          "INVALID_ORDER_INPUT",
          "productId and quantity are required. quantity must be a positive integer.",
        ),
      );
    }

    const requestHash = createRequestHash({ productId, quantity });

    if (idempotencyKey) {
      try {
        ownedIdempotencyRecord = await prisma.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            method: "POST",
            path: "/orders",
            requestHash,
            state: "IN_PROGRESS",
          },
        });
      } catch (error) {
        if (error.code !== "P2002") {
          throw error;
        }

        const existingRecord = await prisma.idempotencyKey.findUnique({
          where: {
            key_method_path: {
              key: idempotencyKey,
              method: "POST",
              path: "/orders",
            },
          },
        });

        if (!existingRecord) {
          throw error;
        }

        if (existingRecord.requestHash !== requestHash) {
          return next(
            createHttpError(
              409,
              "IDEMPOTENCY_KEY_CONFLICT",
              "Idempotency-Key is already used for a different request.",
            ),
          );
        }

        if (
          existingRecord.state === "COMPLETED" &&
          existingRecord.responseStatus &&
          existingRecord.responseBody
        ) {
          res.setHeader("Idempotency-Replayed", "true");
          return res
            .status(existingRecord.responseStatus)
            .json(JSON.parse(existingRecord.responseBody));
        }

        return next(
          createHttpError(
            409,
            "IDEMPOTENCY_REQUEST_IN_PROGRESS",
            "A request with this Idempotency-Key is already being processed.",
          ),
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const orderResult = await createOrderWithInventory(tx, productId, quantity);

      if (orderResult.status !== "created") {
        return orderResult;
      }

      if (ownedIdempotencyRecord) {
        await tx.idempotencyKey.update({
          where: { id: ownedIdempotencyRecord.id },
          data: {
            state: "COMPLETED",
            responseStatus: 201,
            responseBody: JSON.stringify(orderResult.order),
          },
        });
      }

      return orderResult;
    });

    if (result.status === "not_found") {
      if (ownedIdempotencyRecord) {
        await prisma.idempotencyKey.deleteMany({
          where: {
            id: ownedIdempotencyRecord.id,
            state: "IN_PROGRESS",
          },
        });
      }

      return next(
        createHttpError(404, "PRODUCT_NOT_FOUND", "Product not found."),
      );
    }

    if (result.status === "insufficient_stock") {
      if (ownedIdempotencyRecord) {
        await prisma.idempotencyKey.deleteMany({
          where: {
            id: ownedIdempotencyRecord.id,
            state: "IN_PROGRESS",
          },
        });
      }

      return next(
        createHttpError(409, "INSUFFICIENT_STOCK", "Insufficient stock."),
      );
    }

    res.status(201).json(result.order);
  } catch (error) {
    if (ownedIdempotencyRecord) {
      await prisma.idempotencyKey.deleteMany({
        where: {
          id: ownedIdempotencyRecord.id,
          state: "IN_PROGRESS",
        },
      });
    }

    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId)) {
      return next(createHttpError(404, "ORDER_NOT_FOUND", "Order not found."));
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return { status: "not_found" };
      }

      await tx.product.update({
        where: { id: order.productId },
        data: {
          stock: {
            increment: order.quantity,
          },
        },
      });

      const deletedOrder = await tx.order.delete({
        where: { id: orderId },
      });

      return { status: "deleted", order: deletedOrder };
    });

    if (result.status === "not_found") {
      return next(createHttpError(404, "ORDER_NOT_FOUND", "Order not found."));
    }

    res.status(200).json(result.order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
