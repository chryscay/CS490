vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "test-uid",
      email: "test@test.com",
      name: "Chris",
    }),
  }),
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));

vi.mock("./dao/usersDAO.js", () => ({
  default: {
    findByFirebaseUid: vi.fn(),
    addUser: vi.fn(),
  },
}));

import request from "supertest";
import { vi, describe, it, expect, beforeEach } from "vitest";
import app from "./app.js";
import UsersDAO from "./dao/usersDAO.js";

describe("health endpoint", () => {
  it("returns status ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user (happy path + persistence)", async () => {
    UsersDAO.findByFirebaseUid.mockResolvedValue(null);
    UsersDAO.addUser.mockResolvedValue({ insertedId: "x" });

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", "Bearer faketoken")
      .send({ displayName: "Chris" });

    expect(res.status).toBe(201);
    expect(UsersDAO.addUser).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: "test-uid",
        email: "test@test.com",
        displayName: "Chris",
      }),
    );
  });

  it("rejects missing auth header (401)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ displayName: "Chris" });

    expect(res.status).toBe(401);
  });

  it("rejects blank display name (400, field-level)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", "Bearer faketoken")
      .send({ displayName: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/display name is required/i);
  });

  it("rejects duplicate user (409)", async () => {
    UsersDAO.findByFirebaseUid.mockResolvedValue({ firebaseUid: "test-uid" });

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", "Bearer faketoken")
      .send({ displayName: "Chris" });

    expect(res.status).toBe(409);
  });
});
