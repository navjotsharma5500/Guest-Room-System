import { jest } from "@jest/globals";

// Regression suites must never deliver email or contact SMTP.
jest.unstable_mockModule("../../emails/sendEmail.js", () => ({
  sendEmail: jest.fn(async () => true), safeSend: jest.fn(async () => true),
  sendEmailAdvanced: jest.fn(async () => true), sendBulkEmails: jest.fn(async () => ({})),
  getEmailStats: jest.fn(() => ({})), resetEmailCounters: jest.fn(),
}));
