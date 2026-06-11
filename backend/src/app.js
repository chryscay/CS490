import cors from "cors";
import express from "express";
import auth from "./routes/auth/auth.route.js";

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());
app.use(cors());

// Health check — used to verify backend is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", auth);

export default app;
