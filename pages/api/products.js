// pages/api/products.js

import {
  store,
  validateProduct,
  methodNotAllowed,
} from "../../lib/lab-store";

function readPrice(value) {
  if (value === undefined) return undefined;

  if (
    typeof value !== "string" ||
    !/^\d+(\.\d+)?$/.test(value)
  ) {
    return null;
  }

  const price = Number(value);

  return Number.isFinite(price) ? price : null;
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  // GET /api/products?minPrice=20&maxPrice=100&name=Teclado
  if (req.method === "GET") {
    const minPrice = readPrice(req.query.minPrice);
    const maxPrice = readPrice(req.query.maxPrice);
    const { name } = req.query;

    if (minPrice === null || maxPrice === null) {
      return res.status(400).json({
        message: "Los precios deben ser números mayores o iguales que cero.",
      });
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      return res.status(400).json({
        message: "El precio mínimo no puede superar al máximo.",
      });
    }

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        message: "El filtro name debe aparecer una sola vez.",
      });
    }

    let result = [...store.products];

    if (minPrice !== undefined) {
      result = result.filter((product) => product.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      result = result.filter((product) => product.price <= maxPrice);
    }

    if (name !== undefined) {
      const search = name.trim().toLowerCase();

      result = result.filter((product) =>
        product.name.toLowerCase().includes(search)
      );
    }

    return res.status(200).json(result);
  }

  // POST /api/products
  if (req.method === "POST") {
    const error = validateProduct(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const product = {
      id: store.nextProductId++,
      name: req.body.name.trim(),
      price: req.body.price,
    };

    store.products.push(product);

    return res.status(201).json(product);
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}