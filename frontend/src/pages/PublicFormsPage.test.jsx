import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PublicFormsPage from "./PublicFormsPage";
import { PublicHeader } from "./CampusConnect";
import { DEFAULT_PUBLIC_UI_CONFIG } from "../utils/publicUiConfig";
import { createPublicForm, invalidatePublicForms, setPublicFormStatus } from "../utils/publicFormsApi";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock("../components/PublicPageWidgets", () => () => null);
jest.mock("../components/CampusFeedbackSection", () => () => null);
jest.mock("../utils/publicUiConfig", () => {
  const actual = jest.requireActual("../utils/publicUiConfig");
  return { ...actual, fetchPublicUiConfig: () => new Promise(() => {}) };
});
jest.mock("framer-motion", () => {
  const React = require("react");
  const make = (tag) => React.forwardRef(({ initial, animate, exit, transition, ...props }, ref) => React.createElement(tag, { ...props, ref }));
  return { motion: { article: make("article"), div: make("div") }, AnimatePresence: ({ children }) => children, useReducedMotion: () => true };
});

const form = { _id: "507f1f77bcf86cd799439011", title: "Research Support Request", code: "RS9", slug: "research-support-request", description: "Support for laboratory visits", category: "Research Support", keywords: ["equipment"], fileUrl: "https://ik.imagekit.io/test/Lab%20Support.pdf?version=2", fileType: "PDF", featured: true, order: 1 };
const other = { ...form, _id: "507f1f77bcf86cd799439012", title: "Creative Project", code: "CP2", category: "Creative Resources", description: "Exhibition proposal", keywords: ["artwork"], slug: "creative-project", featured: false, order: 2 };
const json = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data });

beforeEach(() => {
  mockNavigate.mockClear();
  global.fetch = jest.fn(() => json({ success: true, forms: [form, other] }));
  invalidatePublicForms();
});

test("renders API cards, exact View URL and Mongo ID download; page and header share one initial request", async () => {
  render(<PublicFormsPage />);
  expect(screen.getByRole("heading", { name: "Public Forms & Downloads" })).toBeInTheDocument();
  const card = await screen.findByRole("article", { name: form.title });
  expect(within(card).getByText(form.code)).toBeInTheDocument();
  expect(within(card).getByText("Featured")).toBeInTheDocument();
  const view = within(card).getByRole("link", { name: "View Form" });
  expect(view).toHaveAttribute("href", form.fileUrl);
  expect(view).toHaveAttribute("target", "_blank");
  expect(view).toHaveAttribute("rel", "noopener noreferrer");
  expect(within(card).getByRole("link", { name: "Download" })).toHaveAttribute("href", `/api/public-forms/${form._id}/download`);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/api/public-forms", expect.objectContaining({ credentials: "include" }));
});

test("loading the page alone does not increment any form's view count", async () => {
  render(<PublicFormsPage />);
  await screen.findByRole("article", { name: form.title });
  const viewCalls = fetch.mock.calls.filter(([url]) => url.endsWith("/view"));
  expect(viewCalls).toHaveLength(0);
});

test("clicking View Form increments the view count; Download does not", async () => {
  render(<PublicFormsPage />);
  const card = await screen.findByRole("article", { name: form.title });
  fireEvent.click(within(card).getByRole("link", { name: "View Form" }));
  await waitFor(() => expect(fetch.mock.calls.some(([url, options]) => url === `/api/public-forms/${form._id}/view` && options.method === "POST")).toBe(true));
  const viewCalls = fetch.mock.calls.filter(([url]) => url.endsWith("/view"));
  expect(viewCalls).toHaveLength(1);
  fireEvent.click(within(card).getByRole("link", { name: "Download" }));
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/view"))).toHaveLength(1);
});

test("shows loading skeletons while the API is pending", () => {
  fetch.mockImplementation(() => new Promise(() => {}));
  render(<PublicFormsPage />);
  expect(screen.getByRole("status", { name: "Loading forms" })).toBeInTheDocument();
});

test("shows API error and Retry recovers", async () => {
  fetch.mockImplementationOnce(() => json({ message: "Unavailable" }, false, 503));
  render(<PublicFormsPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the forms right now.");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("article", { name: form.title })).toBeInTheDocument();
});

test("empty database has a distinct empty state", async () => {
  fetch.mockImplementation(() => json({ success: true, forms: [] }));
  render(<PublicFormsPage />);
  expect(await screen.findByText("No public forms are currently available.")).toBeInTheDocument();
});

test.each(["rESeArCh", "RS9", "laboratory", "equipment", "Research Support"])("search matches API fields case-insensitively: %s", async (term) => {
  render(<PublicFormsPage />);
  await screen.findByRole("article", { name: form.title });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: term } });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: form.title })).toBeInTheDocument();
});

test("categories are dynamic; no-match filters can be cleared", async () => {
  render(<PublicFormsPage />);
  await screen.findByRole("article", { name: form.title });
  fireEvent.click(screen.getByRole("button", { name: other.category }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: other.title })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nonexistent" } });
  expect(screen.getByText("No matching forms found.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear Search & Filters" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("shared header backfills forms without mutating custom navigation or duplicating configured entries", async () => {
  const onOpen = jest.fn();
  const custom = { id: "custom", title: "Custom destination", destination: "/custom", order: 1 };
  const navigation = [custom, { id: "public-forms", title: "Public Forms", order: 2 }, { id: "duplicate", title: "Resources", destination: "/public-forms", order: 3 }];
  const original = JSON.stringify(navigation);
  render(<PublicHeader config={{ ...DEFAULT_PUBLIC_UI_CONFIG, navigation }} onOpen={onOpen} />);
  expect(screen.getAllByRole("button", { name: "Public Forms" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Custom destination" }));
  expect(onOpen).toHaveBeenCalledWith(custom);
  fireEvent.click(screen.getByRole("button", { name: "Public Forms" }));
  const link = await screen.findByRole("link", { name: `${form.title} ${form.code}` });
  expect(link).toHaveAttribute("href", form.fileUrl);
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  fireEvent.click(screen.getByRole("link", { name: /View All Forms/ }));
  expect(onOpen).toHaveBeenLastCalledWith({ destination: "/public-forms" });
  expect(JSON.stringify(navigation)).toBe(original);
});

test("clicking a form in the header dropdown increments its view count", async () => {
  render(<PublicHeader config={{ ...DEFAULT_PUBLIC_UI_CONFIG, navigation: [] }} onOpen={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Public Forms" }));
  const link = await screen.findByRole("link", { name: `${form.title} ${form.code}` });
  const viewCallsBefore = fetch.mock.calls.filter(([url]) => url.endsWith("/view"));
  expect(viewCallsBefore).toHaveLength(0);
  fireEvent.click(link);
  await waitFor(() => expect(fetch.mock.calls.some(([url, options]) => url === `/api/public-forms/${form._id}/view` && options.method === "POST")).toBe(true));
});

test("dropdown handles forty API records in a scroll container and supports keyboard navigation", async () => {
  const forms = Array.from({ length: 40 }, (_, index) => ({ ...form, _id: String(index), title: `Resource ${index}`, code: "" }));
  fetch.mockImplementation(() => json({ success: true, forms }));
  render(<PublicHeader config={{ ...DEFAULT_PUBLIC_UI_CONFIG, navigation: [] }} onOpen={mockNavigate} />);
  const trigger = screen.getByRole("button", { name: "Public Forms" });
  fireEvent.click(trigger);
  await screen.findByRole("link", { name: "Resource 39" });
  const list = screen.getByRole("list", { name: "Available public forms" });
  expect(list).toHaveClass("pf-dropdown-scroll");
  expect(within(list).getAllByRole("listitem")).toHaveLength(40);
  expect(within(list).getAllByRole("link").map((link) => link.textContent)).toEqual(forms.map((item) => item.title));
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(screen.getByRole("link", { name: "Resource 0" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("link", { name: "Resource 0" }), { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("future API additions and disabling refresh the public page, categories, search and dropdown without remount", async () => {
  let current = [form];
  fetch.mockImplementation((url, options) => {
    if (options.method === "POST") { current = [...current, { ...JSON.parse(options.body), _id: other._id }]; return json({ success: true }); }
    if (options.method === "PATCH") { current = current.filter((item) => item._id !== other._id); return json({ success: true }); }
    return json({ success: true, forms: current });
  });
  render(<PublicFormsPage />);
  await screen.findByRole("article", { name: form.title });
  await act(async () => { await createPublicForm({ title: other.title, code: other.code, slug: other.slug, category: other.category, description: other.description, keywords: other.keywords, fileUrl: other.fileUrl, order: other.order }); });
  expect(await screen.findByRole("article", { name: other.title })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: other.category })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "artwork" } });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Public Forms" }));
  expect(await screen.findByRole("link", { name: `${other.title} ${other.code}` })).toHaveAttribute("href", other.fileUrl);
  await act(async () => { await setPublicFormStatus(other._id, false); });
  await waitFor(() => expect(screen.queryByRole("article", { name: other.title })).not.toBeInTheDocument());
  expect(screen.queryByRole("link", { name: `${other.title} ${other.code}` })).not.toBeInTheDocument();
});
