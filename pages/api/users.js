// pages/api/users.js

import {
  store,
  parseId,
  validateUser,
  methodNotAllowed,
} from "../../lib/lab-store";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const allowed = ["GET", "POST", "PUT", "DELETE"];

  if (!allowed.includes(req.method)) {
    return methodNotAllowed(res, allowed);
  }

  // GET /api/users
  // GET /api/users?id=2
  if (req.method === "GET") {
    if (req.query.id === undefined) {
      return res.status(200).json(store.users);
    }

    const id = parseId(req.query.id);

    if (id === null) {
      return res.status(400).json({
        message: "El id debe ser un número entero positivo.",
      });
    }

    const user = store.users.find((item) => item.id === id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    return res.status(200).json(user);
  }

  // POST /api/users
  if (req.method === "POST") {
    const error = validateUser(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const email = req.body.email.trim().toLowerCase();

    if (store.users.some((user) => user.email.toLowerCase() === email)) {
      return res.status(409).json({
        message: "Ya existe un usuario con ese correo.",
      });
    }

    const user = {
      id: store.nextUserId++,
      name: req.body.name.trim(),
      email,
      age: req.body.age,
    };

    store.users.push(user);

    return res.status(201).json(user);
  }

  // PUT y DELETE requieren un id en la URL.
  const id = parseId(req.query.id);

  if (id === null) {
    return res.status(400).json({
      message: "Envía un id entero positivo en la URL: ?id=2",
    });
  }

  const index = store.users.findIndex((user) => user.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  // PUT /api/users?id=2
  if (req.method === "PUT") {
    const error = validateUser(req.body, true);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const { name, email, age } = req.body;
    const changes = {};

    if (name !== undefined) {
      changes.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      const duplicate = store.users.some(
        (user) =>
          user.id !== id &&
          user.email.toLowerCase() === normalizedEmail
      );

      if (duplicate) {
        return res.status(409).json({
          message: "Ya existe otro usuario con ese correo.",
        });
      }

      changes.email = normalizedEmail;
    }

    if (age !== undefined) {
      changes.age = age;
    }

    // Conserva los campos originales que no fueron enviad
    store.users[index] = {
      ...store.users[index],
      ...changes,
    };

    return res.status(200).json(store.users[index]);
  }

  // DELETE /api/users?id=2
  store.users.splice(index, 1);

  return res.status(200).json({
    message: "Usuario eliminado.",
    id,
  });
}