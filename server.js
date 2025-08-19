// ======================= IMPORTS =======================
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

// ======================= CONFIG =======================
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // 👈 .env me add karna na bhoolna

// ======================= DB CONNECT =======================
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB Error:", err));

// ======================= MODELS =======================
const noticeSchema = new mongoose.Schema({
  title: String,
  body: String,
  category: String,
  postedBy: String,
  date: { type: Date, default: Date.now },
  pinned: { type: Boolean, default: false }
});

const Notice = mongoose.model("Notice", noticeSchema);

// Demo users (normally DB me store karte)
const USERS = [
  { email: "admin@college.com", password: "admin123", role: "admin" },
  { email: "student@college.com", password: "student123", role: "student" }
];

// ======================= MIDDLEWARE =======================
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token is not valid" });
    req.user = user;
    next();
  });
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only!" });
  }
  next();
}

// ======================= ROUTES =======================

// --- Login ---
app.post("/api/login", (req, res) => {
  const { email, password, role } = req.body;

  const user = USERS.find(u => u.email === email && u.password === password && u.role === role);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "2h" });

  res.json({ success: true, role: user.role, token });
});

// --- Get All Notices (public) ---
app.get("/api/notices", async (req, res) => {
  try {
    const notices = await Notice.find().sort({ pinned: -1, date: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notices" });
  }
});

// --- Create Notice (admin only) ---
app.post("/api/notices", authMiddleware, adminOnly, async (req, res) => {
  try {
    const notice = new Notice(req.body);
    await notice.save();
    res.json({ message: "Notice created successfully", notice });
  } catch (err) {
    res.status(500).json({ message: "Failed to create notice" });
  }
});

// --- Update Notice (admin only) ---
app.put("/api/notices/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const updated = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Notice updated", notice: updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notice" });
  }
});

// --- Delete Notice (admin only) ---
app.delete("/api/notices/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: "Notice deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete notice" });
  }
});

// ======================= START SERVER =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
