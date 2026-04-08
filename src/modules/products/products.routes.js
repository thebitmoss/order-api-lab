const express = require("express");
const prisma = require("../../lib/prisma");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "asc" },
    });

    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, price, stock = 0 } = req.body;

    if (!name || typeof price !== "number" || typeof stock !== "number") {
      return res.status(400).json({
        message: "name, price, and stock are required. price and stock must be numbers.",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        price,
        stock,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
