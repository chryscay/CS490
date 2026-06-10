vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "test-uid",
      email: "test@test.com",
      displayName: "Chris",
    }),
  }),
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));

import request from "supertest";
import { vi, describe, expect, it } from "vitest";
import app from "./app.js";

describe("health endpoint", () => {
  it("returns status ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
