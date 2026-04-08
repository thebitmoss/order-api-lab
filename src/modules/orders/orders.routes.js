const express = require("express");
const prisma = require("../../lib/prisma");

const router = express.Router();

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
  try {
    const { productId, quantity } = req.body;

    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        message: "productId and quantity are required. quantity must be a positive integer.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
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
    });

    if (result.status === "not_found") {
      return res.status(404).json({ message: "Product not found." });
    }

    if (result.status === "insufficient_stock") {
      return res.status(409).json({ message: "Insufficient stock." });
    }

    res.status(201).json(result.order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
