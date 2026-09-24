import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./pages/Login", () => () => <div>Login</div>);
jest.mock("./pages/InstallApp", () => () => <div>InstallApp</div>);
jest.mock("./pages/CampusConnect", () => () => <div>CampusConnect</div>);
jest.mock("./pages/admin/DashboardSelector", () => () => <div>DashboardSelectorGlass</div>);
jest.mock("./GuestRoomDashboard", () => () => <div>GuestRoomDashboard</div>);
jest.mock("./VenueBookingDashboard", () => () => <div>VenueBookingDashboard</div>);
jest.mock("./pages/VenueGuestEnquiryPage", () => () => <div>VenueGuestEnquiryPage</div>);
jest.mock("./pages/PublicEventCalendar", () => () => <div>PublicEventCalendar</div>);
jest.mock("./pages/PublicAllEventsPage", () => () => <div>PublicAllEventsPage</div>);
jest.mock("./pages/PublicUpcomingEventsPage", () => () => <div>PublicUpcomingEventsPage</div>);
jest.mock("./pages/EventCalendarAdminPage", () => () => <div>EventCalendarAdminPage</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomPublicLayout", () => () => <div>GuestRoomPublicLayout</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomHome", () => () => <div>GuestRoomHome</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomAbout", () => () => <div>GuestRoomAbout</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomRooms", () => () => <div>GuestRoomRooms</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomTariff", () => () => <div>GuestRoomTariff</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomDining", () => () => <div>GuestRoomDining</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomFacilities", () => () => <div>GuestRoomFacilities</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomGallery", () => () => <div>GuestRoomGallery</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomBooking", () => () => <div>GuestRoomBooking</div>);
jest.mock("./pages/publicGuestRoom/GuestRoomContact", () => () => <div>GuestRoomContact</div>);
jest.mock("./pages/PublicGuestFeedback", () => () => <div>PublicGuestFeedback</div>);
jest.mock("./pages/GuestSupportPortal", () => () => <div>GuestSupportPortal</div>);
jest.mock("./components/GuestFeedbackQRCode", () => () => <div>GuestFeedbackQRCode</div>);
jest.mock("./pages/AllHostelsPortal", () => () => <div>AllHostelsPortal</div>);
jest.mock("./pages/ApprovalPage", () => () => <div>ApprovalPage</div>);
jest.mock("./pages/SettingsPage", () => () => <div>SettingsPage</div>);
jest.mock("./pages/PoliciesPage", () => () => <div>PoliciesPage</div>);
jest.mock("./pages/TermsPage", () => () => <div>TermsPage</div>);
jest.mock("./pages/LicensePage", () => () => <div>LicensePage</div>);
jest.mock("./pages/admin/AdvancedAnalyticsPage", () => () => <div>AdvancedAnalyticsPage</div>);
jest.mock("./pages/admin/EchoKnowledgePage", () => () => <div>EchoKnowledgePage</div>);
jest.mock("./pages/admin/PublicUiCustomizerPage", () => () => <div>PublicUiCustomizerPage</div>);
jest.mock("./pages/admin/CampusFeedbackAdminPage", () => () => <div>CampusFeedbackAdminPage</div>);
jest.mock("./pages/StudentNoticesPage", () => () => <div>StudentNoticesPage</div>);
jest.mock("./pages/PublicFormsPage", () => () => <div>PublicFormsPage</div>);
jest.mock("./pages/admin/PublicFormsAdminPage", () => () => <div>PublicFormsAdminPage</div>);
jest.mock("./pages/admin/StudentNoticesAdminPage", () => () => <div>StudentNoticesAdminPage</div>);
jest.mock("./pages/admin/AuditActivityPage", () => () => <div>AuditActivityPage</div>);
jest.mock("./pages/PublicVenueCalendar", () => () => <div>PublicVenueCalendar</div>);

let mockPath = "/public-forms";
let mockUser = null;
jest.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => require("react").Children.toArray(children).find((child) => child.props.path === mockPath)?.props.element || null,
  Route: () => null,
  Navigate: ({ to }) => <div>Redirect {to}</div>,
  useLocation: () => ({ pathname: mockPath }),
}), { virtual: true });
jest.mock("./context/AuthContext", () => ({ useAuth: () => ({ currentUser: mockUser, loading: false }) }));
jest.mock("./hooks/useSystemSettings", () => () => ({ settings: { dashboardRegistry: [] } }));
jest.mock("./utils/analytics", () => ({ trackPageView: jest.fn() }));
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock("@capacitor/push-notifications", () => ({ PushNotifications: {} }));
jest.mock("@react-oauth/google", () => ({ GoogleOAuthProvider: ({ children }) => children }));

test("public forms deep-link route renders without login", () => {
  mockPath = "/public-forms";
  mockUser = null;
  render(<App />);
  expect(screen.getByText("PublicFormsPage")).toBeInTheDocument();
});

test("admin forms deep-link route renders for an active Admin", () => {
  mockPath = "/admin/public-forms";
  mockUser = { role: "admin", isActive: true };
  render(<App />);
  expect(screen.getByText("PublicFormsAdminPage")).toBeInTheDocument();
});

test.each([null, "assistant", "caretaker", "adosa", "dd_assistant", "student", "manager", "warden"])("admin forms route denies %s", (role) => {
  mockPath = "/admin/public-forms";
  mockUser = role ? { role } : null;
  render(<App />);
  expect(screen.queryByText("PublicFormsAdminPage")).not.toBeInTheDocument();
  expect(screen.getByText(`Redirect ${role ? "/admin/dashboard-selector" : "/login"}`)).toBeInTheDocument();
});

test("inactive admin cannot render management", () => {
  mockPath = "/admin/public-forms";
  mockUser = { role: "admin", isActive: false };
  render(<App />);
  expect(screen.queryByText("PublicFormsAdminPage")).not.toBeInTheDocument();
});
