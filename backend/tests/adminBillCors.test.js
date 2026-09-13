import request from "supertest";
import "./helpers/noEmail.js";
process.env.NODE_ENV = "test";
const app = (await import("../index.js")).default;

test("admin bill browser preflight permits the idempotency header", async () => {
  const response = await request(app).options("/api/payments/bookings/507f1f77bcf86cd799439011/admin-bill")
    .set("Origin", "http://localhost:3000")
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type,idempotency-key");
  expect([200, 204]).toContain(response.status);
  expect(response.headers["access-control-allow-headers"].toLowerCase()).toContain("idempotency-key");
  expect(response.headers["access-control-allow-credentials"]).toBe("true");
});
