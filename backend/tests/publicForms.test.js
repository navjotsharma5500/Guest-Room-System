import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import { Readable } from "node:stream";
import { Headers } from "node-fetch";
import { MongoMemoryServer } from "mongodb-memory-server";
import PublicForm from "../models/PublicForm.js";
import User from "../models/User.js";
import { INITIAL_PUBLIC_FORMS } from "../data/publicForms.js";
import { seedPublicForms } from "../scripts/seedPublicForms.js";
import { createPublicFormDownload, safeLookup, isPublicIPv4, allowedDownloadUrl } from "../services/publicFormDownload.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "public-forms-test-secret";
const app = (await import("../index.js")).default;
jest.setTimeout(120000);
let mongo;
let admin;
let adminToken;
let studentToken;
let assistantToken;
let inactiveToken;
const base = {
  title: "Test Form", slug: "test-form", category: "New admin-defined category",
  fileUrl: "https://ik.imagekit.io/test/file%20name.pdf", order: 1,
};
const adminRequest = (method, path) => request(app)[method](`/api/public-forms${path}`).set("Authorization", `Bearer ${adminToken}`);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const users = await User.create([
    { name: "Forms Admin", email: "forms-admin@thapar.edu", password: "test-password", role: "admin" },
    { name: "Student", email: "forms-student@thapar.edu", password: "test-password", role: "student" },
    { name: "Assistant", email: "forms-assistant@thapar.edu", password: "test-password", role: "assistant" },
    { name: "Inactive", email: "forms-inactive@thapar.edu", password: "test-password", role: "admin", isActive: false },
  ]);
  [admin] = users;
  [adminToken, studentToken, assistantToken, inactiveToken] = users.map((user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET));
  await PublicForm.init();
});
beforeEach(async () => { await PublicForm.deleteMany({}); });
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });

test("public list and detail require no auth, hide disabled forms and audit fields, and sort order then title", async () => {
  const forms = await PublicForm.create([
    { ...base, title: "Zulu", slug: "zulu", order: 2, createdBy: admin._id },
    { ...base, title: "Alpha", slug: "alpha", order: 2 },
    { ...base, title: "First", slug: "first", order: 1 },
    { ...base, title: "Hidden", slug: "hidden", order: 0, enabled: false },
  ]);
  const response = await request(app).get("/api/public-forms").expect(200);
  expect(response.body.forms.map((form) => form.title)).toEqual(["First", "Alpha", "Zulu"]);
  const detail = await request(app).get(`/api/public-forms/${forms[0]._id}`).expect(200);
  expect(Object.keys(detail.body.form).sort()).toEqual([
    "_id", "title", "code", "slug", "description", "category", "fileUrl", "originalFileName", "fileType", "keywords", "featured", "order",
  ].sort());
  await request(app).get(`/api/public-forms/${forms[3]._id}`).expect(404);
  await request(app).get("/api/public-forms/not-an-id").expect(400);
  await request(app).get(`/api/public-forms/${new mongoose.Types.ObjectId()}`).expect(404);
});

test("public category and literal search filters work without allowing query operators", async () => {
  await PublicForm.create([{ ...base, keywords: ["Travel (UG)"] }, { ...base, slug: "other", category: "Other" }]);
  const category = await request(app).get("/api/public-forms").query({ category: base.category }).expect(200);
  expect(category.body.forms).toHaveLength(1);
  const search = await request(app).get("/api/public-forms").query({ search: "(UG)" }).expect(200);
  expect(search.body.forms).toHaveLength(1);
  const literal = await request(app).get("/api/public-forms").query({ search: ".*" }).expect(200);
  expect(literal.body.forms).toEqual([]);
  await request(app).get("/api/public-forms?category[$ne]=hidden").expect(400);
});

test("admin can create, edit all metadata, disable, re-enable and delete with identity attribution", async () => {
  const created = await adminRequest("post", "/admin").send({ ...base, title: " Test Form " }).expect(201);
  const id = created.body.form._id;
  expect(created.body.form).toMatchObject({ title: "Test Form", enabled: true, featured: false, fileType: "PDF", createdBy: String(admin._id), updatedBy: String(admin._id) });
  expect(created.body.form.createdAt).toBeTruthy();
  const edit = { title: "Edited", code: "NEW", slug: "edited-form", description: "Updated description", category: "Another category", fileUrl: "http://example.com/new.pdf", originalFileName: "new.pdf", fileType: "PDF", keywords: ["new", "travel"], featured: true, order: 8 };
  const updated = await adminRequest("put", `/admin/${id}`).send(edit).expect(200);
  expect(updated.body.form).toMatchObject(edit);
  expect(new Date(updated.body.form.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.body.form.updatedAt).getTime());
  await adminRequest("patch", `/admin/${id}/status`).send({ enabled: false }).expect(200);
  expect((await request(app).get("/api/public-forms")).body.forms).toEqual([]);
  await request(app).get(`/api/public-forms/${id}`).expect(404);
  const all = await request(app).get("/api/public-forms/admin/all").set("Cookie", `token=${adminToken}`).expect(200);
  expect(all.body.forms[0].enabled).toBe(false);
  await adminRequest("patch", `/admin/${id}/status`).send({ enabled: true }).expect(200);
  await request(app).get(`/api/public-forms/${id}`).expect(200);
  await adminRequest("delete", `/admin/${id}`).expect(200);
  expect(await PublicForm.countDocuments()).toBe(0);
});

test("all admin routes reject public, student and inactive admin callers", async () => {
  const form = await PublicForm.create(base);
  const paths = [["get", "/admin/all"], ["post", "/admin"], ["put", `/admin/${form.id}`], ["delete", `/admin/${form.id}`], ["patch", `/admin/${form.id}/status`], ["patch", "/admin/reorder"]];
  for (const [method, path] of paths) {
    await request(app)[method](`/api/public-forms${path}`).send(base).expect(401);
    for (const token of [studentToken, inactiveToken]) {
      await request(app)[method](`/api/public-forms${path}`).set("Authorization", `Bearer ${token}`).send(base).expect(403);
    }
  }
  expect((await PublicForm.findById(form.id)).title).toBe(base.title);
  expect(await PublicForm.countDocuments()).toBe(1);
});

test("assistant can list, create, edit, enable/disable and reorder public forms, but not delete", async () => {
  const assistantRequest = (method, path) => request(app)[method](`/api/public-forms${path}`).set("Authorization", `Bearer ${assistantToken}`);
  const created = await assistantRequest("post", "/admin").send(base).expect(201);
  const id = created.body.form._id;
  expect(created.body.form).toMatchObject({ title: base.title, enabled: true });
  await assistantRequest("get", "/admin/all").expect(200);
  await assistantRequest("put", `/admin/${id}`).send({ ...base, title: "Assistant Edited" }).expect(200);
  await assistantRequest("patch", `/admin/${id}/status`).send({ enabled: false }).expect(200);
  await assistantRequest("patch", "/admin/reorder").send({ items: [{ id, order: 5 }] }).expect(200);
  await assistantRequest("delete", `/admin/${id}`).expect(403);
  expect(await PublicForm.countDocuments({ _id: id })).toBe(1);
});

test("admin can still delete public forms", async () => {
  const form = await PublicForm.create(base);
  await adminRequest("delete", `/admin/${form.id}`).expect(200);
  expect(await PublicForm.countDocuments()).toBe(0);
});

test.each(["not a URL", "ftp://ik.imagekit.io/a.pdf", "javascript:alert(1)", "//ik.imagekit.io/a.pdf", "https://", "https://user:pass@ik.imagekit.io/a.pdf"])("invalid URL is rejected: %s", async (fileUrl) => {
  await adminRequest("post", "/admin").send({ ...base, fileUrl }).expect(400);
  expect(await PublicForm.countDocuments()).toBe(0);
});

test("required fields, strict input types and audit-field ownership are validated", async () => {
  for (const edit of [{ title: " " }, { category: "" }, { slug: "Invalid Slug" }, { order: -1 }, { order: 1.5 }, { enabled: "false" }, { featured: null }, { keywords: "travel" }, { keywords: [42] }, { createdBy: String(admin._id) }, { updatedAt: "2000-01-01" }]) {
    await adminRequest("post", "/admin").send({ ...base, ...edit }).expect(400);
  }
  const form = await PublicForm.create(base);
  await adminRequest("put", `/admin/${form.id}`).send({ fileUrl: "file:///etc/passwd" }).expect(400);
  await adminRequest("patch", `/admin/${form.id}/status`).send({ enabled: "false" }).expect(400);
  expect((await PublicForm.findById(form.id)).fileUrl).toBe(base.fileUrl);
});

test("duplicate slugs return 409 on create and edit", async () => {
  await adminRequest("post", "/admin").send(base).expect(201);
  await adminRequest("post", "/admin").send(base).expect(409);
  const other = await PublicForm.create({ ...base, slug: "other" });
  await adminRequest("put", `/admin/${other.id}`).send({ slug: base.slug }).expect(409);
});

test("reorder updates public order and audit identity; invalid batches do not write", async () => {
  const one = await PublicForm.create(base);
  const two = await PublicForm.create({ ...base, title: "Other", slug: "other", order: 2 });
  await adminRequest("patch", "/admin/reorder").send({ items: [{ id: one.id, order: 9 }, { id: two.id, order: 0 }] }).expect(200);
  expect((await request(app).get("/api/public-forms")).body.forms.map((form) => form._id)).toEqual([two.id, one.id]);
  expect(String((await PublicForm.findById(one.id)).updatedBy)).toBe(String(admin._id));
  await adminRequest("patch", "/admin/reorder").send({ items: [{ id: one.id, order: 0 }, { id: String(new mongoose.Types.ObjectId()), order: 1 }] }).expect(404);
  await adminRequest("patch", "/admin/reorder").send({ items: [{ id: one.id, order: 0 }, { id: one.id, order: 1 }] }).expect(400);
  expect((await PublicForm.findById(one.id)).order).toBe(9);
});

test("POST /:id/view increments viewCount and returns the new count; public reads never change it", async () => {
  const form = await PublicForm.create(base);
  expect(form.viewCount).toBe(0);
  const first = await request(app).post(`/api/public-forms/${form.id}/view`).expect(200);
  expect(first.body).toEqual({ success: true, viewCount: 1 });
  await request(app).get(`/api/public-forms/${form.id}`).expect(200);
  await request(app).get("/api/public-forms").expect(200);
  await request(app).get("/api/public-forms/admin/all").set("Authorization", `Bearer ${adminToken}`).expect(200);
  expect((await PublicForm.findById(form.id)).viewCount).toBe(1);
});

test("view increments run concurrently without losing updates", async () => {
  const form = await PublicForm.create(base);
  await Promise.all(Array.from({ length: 20 }, () => request(app).post(`/api/public-forms/${form.id}/view`).expect(200)));
  expect((await PublicForm.findById(form.id)).viewCount).toBe(20);
});

test("disabled or nonexistent forms cannot have their view count incremented", async () => {
  const disabled = await PublicForm.create({ ...base, enabled: false });
  await request(app).post(`/api/public-forms/${disabled.id}/view`).expect(404);
  expect((await PublicForm.findById(disabled.id)).viewCount).toBe(0);
  await request(app).post(`/api/public-forms/${new mongoose.Types.ObjectId()}/view`).expect(404);
  await request(app).post("/api/public-forms/not-an-id/view").expect(400);
});

test("existing records without a stored viewCount default safely to zero in the admin listing", async () => {
  const form = await PublicForm.create(base);
  await PublicForm.collection.updateOne({ _id: form._id }, { $unset: { viewCount: "" } });
  const all = await request(app).get("/api/public-forms/admin/all").set("Authorization", `Bearer ${adminToken}`).expect(200);
  expect(all.body.forms[0].viewCount).toBe(0);
});

test("seed inserts the exact eight forms, is idempotent, and preserves admin edits, timestamps and additional forms", async () => {
  expect(await seedPublicForms()).toEqual({ inserted: 8, existing: 0 });
  const initial = await PublicForm.find().sort({ order: 1 }).lean();
  expect(initial).toHaveLength(8);
  initial.forEach((form, index) => expect(form).toMatchObject(INITIAL_PUBLIC_FORMS[index]));
  await PublicForm.updateOne({ slug: INITIAL_PUBLIC_FORMS[0].slug }, { $set: { title: "Admin edited", enabled: false, fileUrl: "https://example.com/custom.pdf", order: 99 } });
  await PublicForm.create({ ...base, slug: "manually-added" });
  const before = await PublicForm.find().sort({ slug: 1 }).lean();
  expect(await seedPublicForms()).toEqual({ inserted: 0, existing: 8 });
  expect(await PublicForm.find().sort({ slug: 1 }).lean()).toEqual(before);
});

function downloadApp(options) {
  const download = express();
  download.get("/forms/:id/download", createPublicFormDownload(options));
  return download;
}
const response = (body = "%PDF-test", headers = {}, status = 200) => ({
  status, headers: new Headers({ "content-type": "application/pdf", ...headers }), body: Readable.from([Buffer.from(body)]),
});

test("download streams the stored file with safe attachment headers and restrictive fetch options", async () => {
  const form = await PublicForm.create({ ...base, originalFileName: "form.pdf" });
  const fetchFile = jest.fn(async () => response("%PDF-test", { "content-encoding": "identity" }));
  const result = await request(downloadApp({ fetchFile })).get(`/forms/${form.id}/download`).expect(200);
  expect(result.headers["content-disposition"]).toBe('attachment; filename="form.pdf"');
  expect(result.headers["content-type"]).toBe("application/pdf");
  expect(result.body.toString()).toBe("%PDF-test");
  expect(fetchFile).toHaveBeenCalledWith(base.fileUrl, expect.objectContaining({ redirect: "manual", compress: false, signal: expect.any(AbortSignal) }));
  expect(fetchFile.mock.calls[0][1].agent.options.lookup).toEqual(expect.any(Function));
});

test("disabled forms, arbitrary URL queries and unsupported hosts cannot download or trigger a fetch", async () => {
  const disabled = await PublicForm.create({ ...base, enabled: false });
  const unsupported = await PublicForm.create({ ...base, slug: "unsupported", fileUrl: "https://example.com/file.pdf" });
  const fetchFile = jest.fn();
  const downloads = downloadApp({ fetchFile });
  await request(downloads).get(`/forms/${disabled.id}/download`).expect(404);
  await request(downloads).get(`/forms/${disabled.id}/download?url=https://ik.imagekit.io/other.pdf`).expect(400);
  await request(downloads).get(`/forms/${unsupported.id}/download`).expect(422);
  await request(app).get(`/api/public-forms/${unsupported.id}/download`).expect(422);
  expect(fetchFile).not.toHaveBeenCalled();
});

test.each([
  ["redirect", () => response("", { location: "http://127.0.0.1/" }, 302)],
  ["oversized length", () => response("file", { "content-length": "999999999" })],
  ["compressed response", () => response("file", { "content-encoding": "gzip" })],
])("download rejects %s", async (_, upstream) => {
  const form = await PublicForm.create(base);
  const fetchFile = jest.fn(async () => upstream());
  await request(downloadApp({ fetchFile })).get(`/forms/${form.id}/download`).expect(502);
  expect(fetchFile).toHaveBeenCalledTimes(1);
});

test("download aborts when its overall timeout expires", async () => {
  const form = await PublicForm.create(base);
  const fetchFile = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  await request(downloadApp({ fetchFile, timeoutMs: 20 })).get(`/forms/${form.id}/download`).expect(504);
});

test("chunked downloads exceeding the byte limit are terminated", async () => {
  const form = await PublicForm.create(base);
  const fetchFile = async () => response("more than four bytes", { "content-encoding": "identity" });
  await expect(request(downloadApp({ fetchFile, maxBytes: 4 })).get(`/forms/${form.id}/download`)).rejects.toThrow();
});

test.each(["127.0.0.1", "10.1.2.3", "169.254.169.254", "172.16.0.1", "192.168.0.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "::1", "::ffff:127.0.0.1"])("download DNS rejects non-public address %s", async (address) => {
  expect(isPublicIPv4(address)).toBe(false);
  const resolve = async () => [{ address }];
  await expect(new Promise((accept, reject) => safeLookup(resolve)("ik.imagekit.io", {}, (error, result) => error ? reject(error) : accept(result)))).rejects.toThrow("public IPv4");
});

test("download DNS pins the verified address and host matching is exact", async () => {
  const resolve = jest.fn(async () => [{ address: "8.8.8.8" }]);
  const result = await new Promise((accept, reject) => safeLookup(resolve)("ik.imagekit.io", { all: true }, (error, value) => error ? reject(error) : accept(value)));
  expect(result).toEqual([{ address: "8.8.8.8", family: 4 }]);
  expect(resolve).toHaveBeenCalledTimes(1);
  expect(allowedDownloadUrl(base.fileUrl, "ik.imagekit.io")).toBe(true);
  expect(allowedDownloadUrl("https://files.example.com/a.pdf", "ik.imagekit.io,files.example.com")).toBe(true);
  expect(allowedDownloadUrl("http://[::1]/a.pdf", "[::1]")).toBe(false);
  for (const url of ["https://ik.imagekit.io.evil.com/a.pdf", "https://ik.imagekit.io:8443/a.pdf", "http://127.0.0.1/a.pdf", "https://user@ik.imagekit.io/a.pdf"]) {
    expect(allowedDownloadUrl(url, "ik.imagekit.io")).toBe(false);
  }
});
