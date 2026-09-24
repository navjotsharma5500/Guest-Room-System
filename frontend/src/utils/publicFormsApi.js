import { BACKEND_URL } from "./apiConfig";

const ROOT = `${BACKEND_URL}/api/public-forms`;
export const PUBLIC_FORMS_CHANGED = "campusconnect:public-forms-changed";
export const PUBLIC_FORMS_STORAGE_KEY = "campusconnect.publicForms.updated";
let publicRequest;

async function request(path, { method = "GET", body, admin = false } = {}) {
  const token = admin ? localStorage.getItem("token") : null;
  const response = await fetch(`${ROOT}${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) {
    const message = response.status === 409
      ? "A form with this name already exists. Choose a different title for the new form."
      : data.message || "Unable to load or save public forms. Please try again.";
    throw new Error(message);
  }
  return data;
}

// Share simultaneous requests (page + shared header) without retaining stale data.
export function getPublicForms() {
  if (!publicRequest) {
    const pending = request("").then((data) => {
      if (!Array.isArray(data.forms)) throw new Error("Invalid public forms response.");
      return data.forms;
    });
    publicRequest = pending;
    const clear = () => { if (publicRequest === pending) publicRequest = null; };
    pending.then(clear, clear);
  }
  return publicRequest;
}

export function invalidatePublicForms() {
  publicRequest = null;
  window.dispatchEvent(new Event(PUBLIC_FORMS_CHANGED));
  try { localStorage.setItem(PUBLIC_FORMS_STORAGE_KEY, `${Date.now()}-${Math.random()}`); } catch { /* Storage may be unavailable. */ }
}

async function mutate(path, method, body) {
  const data = await request(path, { method, body, admin: true });
  invalidatePublicForms();
  return data;
}

export const getAdminPublicForms = async () => {
  const data = await request("/admin/all", { admin: true });
  if (!Array.isArray(data.forms)) throw new Error("Invalid public forms response.");
  return data.forms;
};
export const createPublicForm = (body) => mutate("/admin", "POST", body);
export const updatePublicForm = (id, body) => mutate(`/admin/${id}`, "PUT", body);
export const setPublicFormStatus = (id, enabled) => mutate(`/admin/${id}/status`, "PATCH", { enabled });
export const deletePublicForm = (id) => mutate(`/admin/${id}`, "DELETE");
export const reorderPublicForms = (items) => mutate("/admin/reorder", "PATCH", { items: items.map(({ id, order }) => ({ id, order })) });
export const getPublicFormDownloadUrl = (form) => `${ROOT}/${form._id}/download`;

export function isFormFileUrl(value) {
  try { const url = new URL(value); return /^https?:\/\//i.test(value) && !url.username && !url.password; } catch { return false; }
}

export const makeFormSlug = (title) => title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 240).replace(/-$/, "");

export function filenameFromUrl(value) {
  try { return decodeURIComponent(new URL(value).pathname.split("/").pop()).slice(0, 240); } catch { return ""; }
}
