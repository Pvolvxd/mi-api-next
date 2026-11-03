// lib/lab-store.js

const initialData = {
  users: [
    { id: 1, name: "Juan Pérez", email: "juan@example.com", age: 25 },
    { id: 2, name: "María García", email: "maria@example.com", age: 30 },
    { id: 3, name: "Carlos López", email: "carlos@example.com", age: 28 },
  ],
  products: [
    { id: 1, name: "Laptop", price: 1200 },
    { id: 2, name: "Mouse", price: 25 },
    { id: 3, name: "Teclado", price: 50 },
    { id: 4, name: "Monitor", price: 300 },
    { id: 5, name: "Webcam", price: 45 },
  ],
  nextUserId: 4,
  nextProductId: 6,
};

// Conserva una única instancia durante la ejecución local.
if (!globalThis.__nextApiLabStore) {
  globalThis.__nextApiLabStore = initialData;
}

export const store = globalThis.__nextApiLabStore;

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function validateUser(body, partial = false) {
  if (!isObject(body)) return "El cuerpo debe ser un objeto JSON.";

  const fields = ["name", "email", "age"];

  if (Object.keys(body).some((key) => !fields.includes(key))) {
    return "Solo se permiten los campos name, email y age.";
  }

  if (partial && !fields.some((key) => body[key] !== undefined)) {
    return "Envía al menos un campo para actualizar.";
  }

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return "El nombre es obligatorio y debe ser texto.";
    }
  }

  if (!partial || body.email !== undefined) {
    if (
      typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
      return "Ingresa un correo electrónico válido.";
    }
  }

  if (!partial || body.age !== undefined) {
    if (
      !Number.isInteger(body.age) ||
      body.age < 0 ||
      body.age > 120
    ) {
      return "La edad debe ser un número entero entre 0 y 120.";
    }
  }

  return null;
}

export function validateProduct(body, partial = false) {
  if (!isObject(body)) return "El cuerpo debe ser un objeto JSON.";

  const fields = ["name", "price"];

  if (Object.keys(body).some((key) => !fields.includes(key))) {
    return "Solo se permiten los campos name y price.";
  }

  if (partial && !fields.some((key) => body[key] !== undefined)) {
    return "Envía al menos un campo para actualizar.";
  }

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return "El nombre es obligatorio y debe ser texto.";
    }
  }

  if (!partial || body.price !== undefined) {
    if (
      typeof body.price !== "number" ||
      !Number.isFinite(body.price) ||
      body.price < 0
    ) {
      return "El precio debe ser un número mayor o igual que cero.";
    }
  }

  return null;
}

export function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return res.status(405).json({ message: "Método no permitido." });
}