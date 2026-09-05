import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StudentNoticesPage from "./StudentNoticesPage";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("./CampusConnect", () => ({ PublicHeader: () => null, PublicQuickLinks: () => null }));
jest.mock("../components/PublicPageWidgets", () => () => null);
jest.mock("framer-motion", () => {
  const React = require("react");
  const strip = ({ initial, animate, exit, transition, whileHover, whileTap, ...props }) => props;
  const make = (Tag) => React.forwardRef((props, ref) => <Tag ref={ref} {...strip(props)} />);
  return { motion: { div: make("div"), article: make("article") }, AnimatePresence: ({ children }) => <>{children}</> };
});

const notice = {
  slug: "n1",
  title: "Test Notice Title",
  description: "Test notice description copy",
  tagId: { name: "Exams" },
  noticeDate: "2026-09-01T00:00:00.000Z",
  publishedAt: "2026-09-01T00:00:00.000Z",
  viewCount: 3,
  attachments: [{ _id: "a1", url: "https://example.com/file.pdf", fileType: "pdf", fileName: "file.pdf", isPrimary: true, order: 0 }],
};
const noticeDetail = { ...notice, content: "Extra body content" };

const jsonResponse = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

beforeEach(() => {
  localStorage.clear();
  window.open = jest.fn();
  global.fetch = jest.fn((url) => {
    const u = String(url);
    if (u.includes("/api/public-ui/config")) return jsonResponse({ success: true, config: {} });
    if (u.includes("/api/student-notices/tags")) return jsonResponse({ tags: [] });
    if (/\/api\/student-notices\/[^/?]+\/view$/.test(u)) return jsonResponse({ viewCount: 4 });
    if (/\/api\/student-notices\/[^/?]+$/.test(u)) return jsonResponse({ notice: noticeDetail });
    if (u.startsWith("/api/student-notices?")) return jsonResponse({ notices: [notice], pagination: { page: 1, pages: 1, total: 1 } });
    return jsonResponse({});
  });
});
afterEach(() => jest.clearAllMocks());

const renderPage = async () => {
  render(<StudentNoticesPage />);
  const card = await screen.findByRole("button", { name: `View notice: ${notice.title}` });
  return card;
};

describe("Student notice card interaction", () => {
  test("no search box is present", async () => {
    await renderPage();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  test("hover over card does not expand/open the document preview", async () => {
    const card = await renderPage();
    expect(screen.queryByTitle(/PDF preview/i)).toBeNull();
    fireEvent.mouseEnter(card);
    fireEvent.mouseOver(card);
    expect(screen.queryByTitle(/PDF preview/i)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("clicking the title opens the notice detail popup", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(notice.title));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(notice.title)).toBeTruthy();
    expect(window.open).not.toHaveBeenCalled();
  });

  test("clicking the description opens the notice detail popup", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(notice.description));
    await screen.findByRole("dialog");
  });

  test("clicking a blank area of the card opens the popup", async () => {
    const card = await renderPage();
    fireEvent.click(card);
    await screen.findByRole("dialog");
  });

  test("View Notice button opens the same single popup", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "View Notice" }));
    const dialogs = await screen.findAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
  });

  test("card click does not directly open the PDF; popup previews it instead", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(notice.title));
    const dialog = await screen.findByRole("dialog");
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByTitle(`${notice.title} PDF preview`)).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: /View Full Notice/i })).toHaveAttribute("href", notice.attachments[0].url);
    expect(within(dialog).getByRole("link", { name: /Download PDF/i })).toBeTruthy();
  });

  test("download action does not trigger the popup", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("link", { name: /Download PDF/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("share action does not trigger the popup", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Copy notice link" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("Enter and Space on a focused card open the popup", async () => {
    const card = await renderPage();
    card.focus();
    fireEvent.keyDown(card, { key: "Enter" });
    await screen.findByRole("dialog");
  });

  test("Space key on focused card opens the popup", async () => {
    const card = await renderPage();
    card.focus();
    fireEvent.keyDown(card, { key: " " });
    await screen.findByRole("dialog");
  });

  test("card is keyboard focusable via role/tabIndex", async () => {
    const card = await renderPage();
    expect(card).toHaveAttribute("tabIndex", "0");
    expect(card.style.cursor || getComputedStyle(card).cursor).toBeDefined();
  });
});
