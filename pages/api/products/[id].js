// pages/api/products/[id].js

import {
  store,
  parseId,
  validateProduct,
  methodNotAllowed,
} from "../../../lib/lab-store";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const allowed = ["GET", "PUT", "DELETE"];

  if (!allowed.includes(req.method)) {
    return methodNotAllowed(res, allowed);
  }

  const id = parseId(req.query.id);

  if (id === null) {
    return res.status(400).json({
      message: "El id debe ser un número entero positivo.",
    });
  }

  const index = store.products.findIndex((product) => product.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Producto no encontrado." });
  }

  // GET /api/products/2
  if (req.method === "GET") {
    return res.status(200).json(store.products[index]);
  }

  // PUT /api/products/2
  if (req.method === "PUT") {
    const error = validateProduct(req.body, true);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const { name, price } = req.body;
    const changes = {};

    if (name !== undefined) changes.name = name.trim();
    if (price !== undefined) changes.price = price;

    store.products[index] = {
      ...store.products[index],
      ...changes,
    };

    return res.status(200).json(store.products[index]);
  }

  // DELETE /api/products/2
  store.products.splice(index, 1);

  return res.status(200).json({
    message: "Producto eliminado.",
    id,
  });
}