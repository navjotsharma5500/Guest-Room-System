import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PublicFormsAdminPage from "./PublicFormsAdminPage";
import { makeFormSlug } from "../../utils/publicFormsApi";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() }, Toaster: () => null }));
let mockUser = { role: "admin" };
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ currentUser: mockUser }) }));

const original = { _id: "507f1f77bcf86cd799439011", title: "Research Support", code: "RS9", slug: "research-support", category: "Research", description: "Lab support", fileUrl: "https://ik.imagekit.io/test/research.pdf", keywords: ["laboratory"], enabled: true, featured: false, order: 1, fileType: "PDF", viewCount: 1245, createdAt: "2026-09-24", updatedBy: "admin-id", __v: 0 };
const second = { ...original, _id: "507f1f77bcf86cd799439012", title: "Studio Access", slug: "studio-access", category: "Creative", order: 2, viewCount: 3 };
let records;
const sent = (method) => fetch.mock.calls.filter(([, options]) => options.method === method);

beforeEach(() => {
  mockUser = { role: "admin" };
  localStorage.setItem("token", "existing-admin-token");
  records = [{ ...original }, { ...second }];
  global.fetch = jest.fn(async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : {};
    if (options.method === "POST") records.push({ ...body, _id: "507f1f77bcf86cd799439013" });
    if (options.method === "PUT") records[0] = { ...records[0], ...body };
    if (options.method === "PATCH" && url.endsWith("/status")) records[0] = { ...records[0], enabled: body.enabled };
    if (options.method === "DELETE") records = records.filter((form) => !url.endsWith(form._id));
    return { ok: true, status: 200, json: async () => ({ success: true, forms: [...records] }) };
  });
});

async function openAdd() {
  render(<PublicFormsAdminPage />);
  await screen.findByRole("article", { name: original.title });
  fireEvent.click(screen.getByRole("button", { name: "Add New Form" }));
  return screen.getByRole("dialog", { name: "Add New Form" });
}

test("loads admin API with existing credentials and shows all management controls", async () => {
  render(<PublicFormsAdminPage />);
  expect(await screen.findByRole("article", { name: original.title })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/public-forms/admin/all", expect.objectContaining({ credentials: "include", headers: { Authorization: "Bearer existing-admin-token" } }));
  expect(screen.getByRole("heading", { name: "Manage Public Forms" })).toBeInTheDocument();
});

test.each(["Research", "Brand New Category"])("creates with an existing or newly typed category: %s", async (category) => {
  const dialog = within(await openAdd());
  expect(dialog.getByRole("combobox", { name: /Category/ })).toHaveAttribute("list", "public-form-categories");
  expect(dialog.getByRole("option", { name: "Research", hidden: true })).toHaveValue("Research");
  fireEvent.change(dialog.getByLabelText("Title *"), { target: { value: "Society Reimbursement Form" } });
  fireEvent.change(dialog.getByRole("combobox", { name: /Category/ }), { target: { value: category } });
  fireEvent.change(dialog.getByLabelText(/Public File URL/), { target: { value: "https://ik.imagekit.io/test/New%20Form.pdf" } });
  fireEvent.change(dialog.getByLabelText("Keywords"), { target: { value: "reimbursement" } });
  fireEvent.keyDown(dialog.getByLabelText("Keywords"), { key: "Enter" });
  expect(dialog.getByRole("button", { name: "Remove keyword reimbursement" })).toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Save Form" }));
  expect(await screen.findByRole("article", { name: "Society Reimbursement Form" })).toBeInTheDocument();
  const payload = JSON.parse(sent("POST")[0][1].body);
  expect(payload).toEqual({
    title: "Society Reimbursement Form", slug: "society-reimbursement-form", code: "", description: "",
    category, fileUrl: "https://ik.imagekit.io/test/New%20Form.pdf", originalFileName: "New Form.pdf",
    fileType: "PDF", keywords: ["reimbursement"], enabled: true, featured: false, order: 3,
  });
});

test("edits only editable fields and preserves the existing slug", async () => {
  render(<PublicFormsAdminPage />);
  const card = within(await screen.findByRole("article", { name: original.title }));
  fireEvent.click(card.getByRole("button", { name: "Edit" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("Title *"), { target: { value: "Updated research title" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save Changes" }));
  await screen.findByRole("article", { name: "Updated research title" });
  const [url, options] = sent("PUT")[0];
  expect(url).toBe(`/api/public-forms/admin/${original._id}`);
  const payload = JSON.parse(options.body);
  expect(payload.title).toBe("Updated research title");
  expect(Object.keys(payload).sort()).toEqual(["title", "code", "category", "description", "fileUrl", "originalFileName", "fileType", "keywords", "enabled", "featured", "order"].sort());
  expect(records[0].slug).toBe(original.slug);
});

test("disable and enable send exactly the status body and keep the admin record visible", async () => {
  render(<PublicFormsAdminPage />);
  const card = within(await screen.findByRole("article", { name: original.title }));
  fireEvent.click(card.getByRole("button", { name: "Disable" }));
  const updated = within(await screen.findByRole("article", { name: original.title }));
  expect(await updated.findByText("Hidden")).toBeInTheDocument();
  expect(JSON.parse(sent("PATCH")[0][1].body)).toEqual({ enabled: false });
  fireEvent.click(updated.getByRole("button", { name: "Enable" }));
  await waitFor(() => expect(sent("PATCH")).toHaveLength(2));
  expect(JSON.parse(sent("PATCH")[1][1].body)).toEqual({ enabled: true });
  await screen.findByRole("article", { name: original.title });
});

test("delete requires confirmation and explains the external file is retained", async () => {
  render(<PublicFormsAdminPage />);
  fireEvent.click(within(await screen.findByRole("article", { name: original.title })).getByRole("button", { name: "Delete" }));
  expect(sent("DELETE")).toHaveLength(0);
  let dialog = within(screen.getByRole("dialog", { name: "Delete this public form?" }));
  expect(dialog.getByText(/It does not delete the original ImageKit file/)).toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  expect(sent("DELETE")).toHaveLength(0);
  fireEvent.click(within(screen.getByRole("article", { name: original.title })).getByRole("button", { name: "Delete" }));
  dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete Form" }));
  await waitFor(() => expect(sent("DELETE")).toHaveLength(1));
  await waitFor(() => expect(screen.queryByRole("article", { name: original.title })).not.toBeInTheDocument());
});

test("reorder uses id rather than _id", async () => {
  render(<PublicFormsAdminPage />);
  await screen.findByRole("article", { name: original.title });
  fireEvent.click(screen.getByRole("button", { name: `Move ${original.title} down` }));
  await waitFor(() => expect(sent("PATCH")).toHaveLength(1));
  expect(sent("PATCH")[0][0]).toBe("/api/public-forms/admin/reorder");
  expect(JSON.parse(sent("PATCH")[0][1].body)).toEqual({ items: [{ id: second._id, order: 1 }, { id: original._id, order: 2 }] });
  await screen.findByRole("article", { name: original.title });
});

test.each([[409, "duplicate", /A form with this name already exists/], [400, "Category is too long", /Category is too long/]])("shows meaningful server validation errors for %s", async (status, message, expected) => {
  const dialog = within(await openAdd());
  fireEvent.change(dialog.getByLabelText("Title *"), { target: { value: "New form" } });
  fireEvent.change(dialog.getByRole("combobox", { name: /Category/ }), { target: { value: "Research" } });
  fireEvent.change(dialog.getByLabelText(/Public File URL/), { target: { value: original.fileUrl } });
  fetch.mockImplementationOnce(async () => ({ ok: false, status, json: async () => ({ success: false, message }) }));
  fireEvent.click(dialog.getByRole("button", { name: "Save Form" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(expected);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("slug generation follows backend rules", () => {
  expect(makeFormSlug("  Society Expense Form! ")).toBe("society-expense-form");
  expect(makeFormSlug("Café & Travel 2027")).toBe("cafe-travel-2027");
  expect(makeFormSlug("---")).toBe("");
});

test("shows each form's view count and the total form opens from the loaded forms, from the database not localStorage", async () => {
  render(<PublicFormsAdminPage />);
  const card = within(await screen.findByRole("article", { name: original.title }));
  expect(card.getByText("1,245 views")).toBeInTheDocument();
  const secondCard = within(await screen.findByRole("article", { name: second.title }));
  expect(secondCard.getByText("3 views")).toBeInTheDocument();
  expect(screen.getByText("1,248")).toBeInTheDocument();
  expect(screen.getByText("Total Form Opens")).toBeInTheDocument();
});

test("forms missing a stored view count show zero instead of crashing", async () => {
  records = [{ ...original, viewCount: undefined }];
  render(<PublicFormsAdminPage />);
  const card = within(await screen.findByRole("article", { name: original.title }));
  expect(card.getByText("0 views")).toBeInTheDocument();
});

test("assistant sees management controls but not Delete", async () => {
  mockUser = { role: "assistant" };
  render(<PublicFormsAdminPage />);
  const card = within(await screen.findByRole("article", { name: original.title }));
  expect(card.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(card.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  expect(card.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});

test("admin still sees Delete", async () => {
  render(<PublicFormsAdminPage />);
  const card = within(await screen.findByRole("article", { name: original.title }));
  expect(card.getByRole("button", { name: "Delete" })).toBeInTheDocument();
});
