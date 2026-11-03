"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
};

type Product = {
  id: number;
  name: string;
  price: number;
};

type Tab = "users" | "products";

type ApiResult = {
  method: string;
  url: string;
  status: number;
  body?: Record<string, unknown>;
  data: unknown;
};

const emptyForm = {
  name: "",
  email: "",
  age: "",
  price: "",
};

export default function TestPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [filters, setFilters] = useState({
    name: "",
    minPrice: "",
    maxPrice: "",
  });

  const [activeProductUrl, setActiveProductUrl] =
    useState("/api/products");

  const [result, setResult] = useState<ApiResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [listError, setListError] = useState("");
  const [filtered, setFiltered] = useState(false);

  const requestLock = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const isUsers = tab === "users";
  const isEditing = editingId !== null;

  const selectedRecord = isUsers
    ? users.find((user) => user.id === editingId)
    : products.find((product) => product.id === editingId);

  // Carga las tablas sin reemplazar la respuesta de la operación principal.
  async function refreshLists(productUrl: string) {
    try {
      const [userResponse, productResponse] = await Promise.all([
        fetch("/api/users", { cache: "no-store" }),
        fetch(productUrl, { cache: "no-store" }),
      ]);

      if (!userResponse.ok || !productResponse.ok) {
        throw new Error("No se pudieron actualizar las tablas.");
      }

      const userData = await userResponse.json();
      const productData = await productResponse.json();

      if (!Array.isArray(userData) || !Array.isArray(productData)) {
        throw new Error("La API no devolvió las listas esperadas.");
      }

      setUsers(userData);
      setProducts(productData);
      setListError("");
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Error de conexión."
      );
    }
  }

  useEffect(() => {
    void refreshLists("/api/products").finally(() => setBusy(false));
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    resetForm();
    setNotice("");
  }

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(id: number) {
    setEditingId(id);
    setForm({ ...emptyForm });
    setNotice("");
    nameInput.current?.focus();
    nameInput.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  async function callApi(
    method: string,
    url: string,
    body?: Record<string, unknown>,
    refreshUrl = activeProductUrl
  ) {
    if (requestLock.current) return false;

    requestLock.current = true;
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch(url, {
        method,
        cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text || "Respuesta sin contenido." };
      }

      setResult({
        method,
        url,
        body,
        status: response.status,
        data,
      });

      if (!response.ok) {
        const errorData = data as { message?: string };
        setNotice(errorData?.message || "La solicitud fue rechazada.");
        return false;
      }

      if (method === "GET" && Array.isArray(data)) {
        if (url.startsWith("/api/users")) {
          setUsers(data as User[]);
        } else {
          setProducts(data as Product[]);
        }
        setListError("");
      }

      if (method !== "GET") {
        await refreshLists(refreshUrl);
      }

      setNotice(
        method === "POST"
          ? "Registro creado correctamente."
          : method === "PUT"
          ? "Cambios guardados correctamente."
          : method === "DELETE"
          ? "Registro eliminado correctamente."
          : "Consulta realizada correctamente."
      );

      return true;
    } catch {
      setResult({
        method,
        url,
        body,
        status: 0,
        data: { message: "No se pudo conectar con el servidor." },
      });

      setNotice("No se pudo conectar. Revisa que npm run dev esté activo.");
      return false;
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body: Record<string, unknown> = {};

    if (!isEditing || form.name.trim() !== "") {
      body.name = form.name.trim();
    }

    if (isUsers) {
      if (!isEditing || form.email.trim() !== "") {
        body.email = form.email.trim();
      }

      if (!isEditing || form.age !== "") {
        body.age = Number(form.age);
      }
    } else if (!isEditing || form.price !== "") {
      body.price = Number(form.price);
    }

    if (isEditing && Object.keys(body).length === 0) {
      setNotice("Completa al menos un campo para actualizar.");
      return;
    }

    const url = isUsers
      ? `/api/users${isEditing ? `?id=${editingId}` : ""}`
      : `/api/products${isEditing ? `/${editingId}` : ""}`;

    const ok = await callApi(isEditing ? "PUT" : "POST", url, body);

    if (ok) resetForm();
  }

  async function deleteRecord(id: number, name: string) {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;

    const url = isUsers
      ? `/api/users?id=${id}`
      : `/api/products/${id}`;

    const ok = await callApi("DELETE", url);

    if (ok && editingId === id) resetForm();
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = new URLSearchParams();

    if (filters.name.trim()) {
      query.set("name", filters.name.trim());
    }

    if (filters.minPrice !== "") {
      query.set("minPrice", filters.minPrice);
    }

    if (filters.maxPrice !== "") {
      query.set("maxPrice", filters.maxPrice);
    }

    const queryText = query.toString();
    const url = `/api/products${queryText ? `?${queryText}` : ""}`;

    const ok = await callApi("GET", url);

    if (ok) {
      setActiveProductUrl(url);
      setFiltered(Boolean(queryText));
    }
  }

  async function clearFilters() {
    const ok = await callApi("GET", "/api/products");

    if (ok) {
      setFilters({ name: "", minPrice: "", maxPrice: "" });
      setActiveProductUrl("/api/products");
      setFiltered(false);
    }
  }

  return (
    <main className="lab">
      <div className="shell">
        <header className="header">
          <div>
            <span className="eyebrow">DESARROLLO WEB · LABORATORIO</span>
            <h1>Panel de API</h1>
            <p>Gestiona usuarios, consulta productos y revisa cada respuesta.</p>
          </div>

          <span className="environment">
            <span />
            Entorno local
          </span>
        </header>

        <nav className="tabs" aria-label="Secciones del laboratorio">
          <button
            type="button"
            className={isUsers ? "tab active" : "tab"}
            aria-pressed={isUsers}
            disabled={busy}
            onClick={() => changeTab("users")}
          >
            Usuarios
          </button>

          <button
            type="button"
            className={!isUsers ? "tab active" : "tab"}
            aria-pressed={!isUsers}
            disabled={busy}
            onClick={() => changeTab("products")}
          >
            Productos
          </button>

          <span className="tab-caption">
            {isUsers ? "CRUD completo" : "Catálogo y filtros"}
          </span>
        </nav>

        {listError && <div className="alert" role="alert">{listError}</div>}

        <div className="workspace">
          <section className="card editor">
            <div className="card-heading">
              <span className="eyebrow">
                {isEditing ? "ACTUALIZACIÓN PARCIAL" : "NUEVO REGISTRO"}
              </span>

              <h2>
                {isEditing ? "Editar" : "Crear"}{" "}
                {isUsers ? "usuario" : "producto"}
              </h2>

              <p>
                {isEditing
                  ? `ID ${editingId}${
                      selectedRecord ? ` · ${selectedRecord.name}` : ""
                    }. Completa solo lo que deseas cambiar.`
                  : "Completa los datos para agregar un registro."}
              </p>
            </div>

            <form onSubmit={submitForm}>
              <fieldset disabled={busy} className="fields">
                <label>
                  Nombre
                  <input
                    ref={nameInput}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder={
                      isEditing
                        ? "Sin cambios"
                        : isUsers
                        ? "Ej. Karla Choque"
                        : "Ej. Audífonos"
                    }
                    required={!isEditing}
                  />
                </label>

                {isUsers ? (
                  <>
                    <label>
                      Correo electrónico
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        placeholder={
                          isEditing ? "Sin cambios" : "nombre@ejemplo.com"
                        }
                        required={!isEditing}
                      />
                    </label>

                    <label>
                      Edad
                      <input
                        type="number"
                        min="0"
                        max="120"
                        step="1"
                        value={form.age}
                        onChange={(event) =>
                          updateField("age", event.target.value)
                        }
                        placeholder={isEditing ? "Sin cambios" : "Ej. 25"}
                        required={!isEditing}
                      />
                    </label>
                  </>
                ) : (
                  <label>
                    Precio
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.price}
                      onChange={(event) =>
                        updateField("price", event.target.value)
                      }
                      placeholder={isEditing ? "Sin cambios" : "Ej. 80"}
                      required={!isEditing}
                    />
                  </label>
                )}

                <button className="primary" type="submit">
                  {busy
                    ? "Procesando…"
                    : isEditing
                    ? "Guardar cambios"
                    : isUsers
                    ? "Crear usuario"
                    : "Crear producto"}
                </button>

                {isEditing && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={resetForm}
                  >
                    Cancelar edición
                  </button>
                )}
              </fieldset>
            </form>

            <div className="form-note">
              <strong>{isEditing ? "PUT parcial" : "POST"}</strong>
              <p>
                {isEditing
                  ? "Los campos vacíos no se envían. Sus valores actuales se conservan."
                  : "El servidor valida los datos y asigna el ID automáticamente."}
              </p>
            </div>
          </section>

          <section className="card records" aria-busy={busy}>
            <div className="list-heading">
              <div>
                <h2>{isUsers ? "Usuarios registrados" : "Productos"}</h2>
                <p>
                  {isUsers ? users.length : products.length}{" "}
                  {filtered && !isUsers
                    ? "resultados del filtro"
                    : "registros"}
                </p>
              </div>

              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void callApi(
                    "GET",
                    isUsers ? "/api/users" : activeProductUrl
                  )
                }
              >
                Actualizar lista
              </button>
            </div>

            {!isUsers && (
              <form className="filter-form" onSubmit={applyFilters}>
                <fieldset disabled={busy} className="filters">
                  <label>
                    Buscar por nombre
                    <input
                      value={filters.name}
                      placeholder="Ej. Teclado"
                      onChange={(event) =>
                        setFilters({
                          ...filters,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Precio mínimo
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.minPrice}
                      placeholder="0"
                      onChange={(event) =>
                        setFilters({
                          ...filters,
                          minPrice: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Precio máximo
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={filters.maxPrice}
                      placeholder="Sin límite"
                      onChange={(event) =>
                        setFilters({
                          ...filters,
                          maxPrice: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="filter-actions">
                    <button type="submit" className="primary">
                      Filtrar
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void clearFilters()}
                    >
                      Limpiar
                    </button>
                  </div>
                </fieldset>
              </form>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    {isUsers ? (
                      <>
                        <th>Correo</th>
                        <th>Edad</th>
                      </>
                    ) : (
                      <th>Precio</th>
                    )}
                    <th className="actions-heading">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {isUsers
                    ? users.map((user) => (
                        <tr key={user.id}>
                          <td className="muted">#{user.id}</td>
                          <td className="record-name">{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.age}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                disabled={busy}
                                onClick={() => startEdit(user.id)}
                                aria-label={`Editar a ${user.name}`}
                              >
                                Editar
                              </button>
                              <button
                                className="danger"
                                disabled={busy}
                                onClick={() =>
                                  void deleteRecord(user.id, user.name)
                                }
                                aria-label={`Eliminar a ${user.name}`}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : products.map((product) => (
                        <tr key={product.id}>
                          <td className="muted">#{product.id}</td>
                          <td className="record-name">{product.name}</td>
                          <td>{product.price.toFixed(2)}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                disabled={busy}
                                onClick={() => startEdit(product.id)}
                                aria-label={`Editar ${product.name}`}
                              >
                                Editar
                              </button>
                              <button
                                className="danger"
                                disabled={busy}
                                onClick={() =>
                                  void deleteRecord(product.id, product.name)
                                }
                                aria-label={`Eliminar ${product.name}`}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                  {(isUsers ? users.length === 0 : products.length === 0) && (
                    <tr>
                      <td colSpan={isUsers ? 5 : 4} className="empty">
                        {busy
                          ? "Cargando registros…"
                          : "No hay registros para mostrar."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="card response" aria-busy={busy}>
          <div className="list-heading">
            <div>
              <span className="eyebrow">INSPECTOR</span>
              <h2>Solicitud y respuesta</h2>
            </div>
            <span className="muted">
              {busy ? "Procesando solicitud…" : "Última operación"}
            </span>
          </div>

          <div className="feedback" role="status" aria-live="polite">
            {notice || "Realiza una operación para ver su resultado."}
          </div>

          {result ? (
            <>
              <div className="request-line">
                <span className="method">{result.method}</span>
                <code>{result.url}</code>
                <span
                  className={
                    result.status >= 200 && result.status < 300
                      ? "status success"
                      : "status failure"
                  }
                >
                  {result.status === 0
                    ? "Sin conexión"
                    : `HTTP ${result.status}`}
                </span>
              </div>

              <div className="json-grid">
                <div>
                  <h3>Body enviado</h3>
                  <pre>
                    {result.body
                      ? JSON.stringify(result.body, null, 2)
                      : "Esta solicitud no envía un cuerpo JSON."}
                  </pre>
                </div>
                <div>
                  <h3>Respuesta del servidor</h3>
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              </div>
            </>
          ) : (
            <div className="inspector-empty">
              Aquí aparecerán el método, la URL, el estado HTTP y el JSON.
            </div>
          )}
        </section>

        <footer>
          Next.js · API Routes
          <span>Datos temporales en memoria · Sin base de datos</span>
        </footer>
      </div>

      <style jsx>{`
        .lab {
          min-height: 100vh;
          background: #f5f6f8;
          color: #20262f;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color-scheme: light;
        }

        .lab * {
          box-sizing: border-box;
        }

        .shell {
          max-width: 1280px;
          margin: 0 auto;
          padding: 48px 28px 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
        }

        .eyebrow {
          color: #697586;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 7px 0 8px;
          font-size: 34px;
          font-weight: 700;
          letter-spacing: -1.2px;
          line-height: 1.2;
        }

        h2 {
          margin: 4px 0;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        h3 {
          margin: 0 0 10px;
          color: #637083;
          font-size: 12px;
          font-weight: 600;
        }

        p {
          margin: 0;
          color: #697586;
          font-size: 13px;
        }

        .environment {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          border: 1px solid #e1e5eb;
          border-radius: 20px;
          padding: 7px 12px;
          background: white;
          color: #546172;
          font-size: 12px;
        }

        .environment span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #748397;
        }

        .tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          margin-bottom: 24px;
          border: 1px solid #e1e5eb;
          border-radius: 12px;
          background: #eceff3;
        }

        button {
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        button:focus-visible {
          outline: 3px solid #b3cafa;
          outline-offset: 3px;
        }

        .tab {
          padding: 10px 23px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #647084;
        }

        .tab.active {
          background: white;
          color: #20262f;
          box-shadow: 0 1px 3px #18283b12;
        }

        .tab-caption {
          margin-left: auto;
          padding-right: 12px;
          color: #697586;
          font-size: 12px;
        }

        .workspace {
          display: grid;
          grid-template-columns: 285px minmax(0, 1fr);
          gap: 22px;
          align-items: start;
        }

        .card {
          background: #ffffff;
          border: 1px solid #e3e7ed;
          border-radius: 14px;
          overflow: hidden;
        }

        .editor {
          padding: 24px;
        }

        .card-heading {
          margin-bottom: 23px;
        }

        .card-heading p {
          margin-top: 7px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        fieldset {
          min-width: 0;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .fields {
          display: grid;
          gap: 17px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #465264;
          font-size: 12px;
          font-weight: 600;
        }

        input {
          width: 100%;
          min-width: 0;
          padding: 10px 11px;
          border: 1px solid #dce2e9;
          border-radius: 7px;
          outline: none;
          background: white;
          color: #20262f;
          font: inherit;
          font-size: 13px;
          font-weight: 400;
        }

        input::placeholder {
          color: #8590a0;
        }

        input:focus {
          border-color: #6589c7;
          box-shadow: 0 0 0 3px #edf2fb;
        }

        .primary,
        .secondary {
          padding: 10px 13px;
          border-radius: 7px;
          white-space: nowrap;
        }

        .primary {
          border: 1px solid #293b52;
          background: #293b52;
          color: white;
        }

        .primary:hover:not(:disabled) {
          background: #1e2e43;
        }

        .secondary {
          border: 1px solid #dce2e9;
          background: white;
          color: #465264;
        }

        .secondary:hover:not(:disabled) {
          background: #f5f7fa;
        }

        .form-note {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #edf0f4;
        }

        .form-note strong {
          font-size: 11px;
          color: #53647c;
        }

        .form-note p {
          margin-top: 5px;
          font-size: 12px;
          line-height: 1.7;
        }

        .list-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
        }

        .filter-form {
          padding: 0 24px 22px;
        }

        .filters {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 12px;
        }

        .filter-actions {
          grid-column: 1 / -1;
          display: flex;
          gap: 8px;
        }

        .table-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }

        th {
          padding: 13px 17px;
          background: #f8f9fb;
          color: #748092;
          border-top: 1px solid #edf0f4;
          border-bottom: 1px solid #edf0f4;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        td {
          padding: 17px;
          border-bottom: 1px solid #edf0f4;
          color: #586577;
          overflow-wrap: anywhere;
        }

        tr:last-child td {
          border-bottom: 0;
        }

        .record-name {
          color: #293548;
          font-weight: 600;
          min-width: 120px;
        }

        .muted {
          color: #738094;
          font-size: 12px;
        }

        .actions-heading {
          text-align: right;
        }

        .row-actions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
        }

        .row-actions button {
          padding: 5px 7px;
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: #456a9a;
          font-size: 11px;
        }

        .row-actions button:hover:not(:disabled) {
          background: #edf3fa;
        }

        .row-actions .danger {
          color: #aa5353;
        }

        .row-actions .danger:hover:not(:disabled) {
          background: #fcf0f0;
        }

        .empty {
          padding: 45px 20px;
          text-align: center;
          color: #7a8799;
        }

        .response {
          margin-top: 24px;
        }

        .response .list-heading {
          padding-bottom: 10px;
        }

        .feedback {
          padding: 0 24px 18px;
          color: #617086;
          font-size: 12px;
        }

        .request-line {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 24px;
          border-top: 1px solid #edf0f4;
          border-bottom: 1px solid #edf0f4;
          background: #fafbfd;
        }

        .request-line code {
          flex: 1;
          overflow-wrap: anywhere;
          font-size: 12px;
          color: #465264;
        }

        .method {
          color: #3f6088;
          font-size: 11px;
          font-weight: 700;
        }

        .status {
          flex-shrink: 0;
          border-radius: 6px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 700;
        }

        .success {
          background: #edf7f1;
          color: #367657;
        }

        .failure {
          background: #fcf0f0;
          color: #a24c4c;
        }

        .json-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 22px 24px;
        }

        .json-grid > div {
          min-width: 0;
        }

        pre {
          min-height: 140px;
          max-height: 330px;
          margin: 0;
          padding: 16px;
          overflow: auto;
          border: 1px solid #e9edf2;
          border-radius: 8px;
          background: #f8f9fb;
          color: #3e526d;
          font-family: Consolas, monospace;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .inspector-empty {
          padding: 24px;
          border-top: 1px solid #edf0f4;
          color: #7a8799;
          font-size: 12px;
        }

        .alert {
          margin-bottom: 18px;
          padding: 13px 16px;
          border: 1px solid #efd9d9;
          border-radius: 8px;
          color: #9c4e4e;
          background: #fff6f6;
        }

        footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 22px 2px 0;
          color: #7e8999;
          font-size: 11px;
        }

        @media (max-width: 1000px) {
          .workspace {
            grid-template-columns: 250px minmax(0, 1fr);
          }

          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .filters label:first-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .shell {
            padding: 26px 16px 20px;
          }

          .header {
            align-items: flex-start;
          }

          h1 {
            font-size: 29px;
          }

          .environment,
          .tab-caption {
            display: none;
          }

          .workspace,
          .json-grid {
            grid-template-columns: 1fr;
          }

          .tab {
            flex: 1;
          }

          .list-heading {
            flex-wrap: wrap;
          }

          .request-line {
            flex-wrap: wrap;
          }

          .request-line code {
            min-width: 150px;
          }

          footer {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}