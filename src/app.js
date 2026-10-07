const express = require("express");
const session = require("express-session");
const { engine } = require("express-handlebars");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const MongoSessionStore = require("./mongo-session-store");
const { studentRules, prepareBook } = require("./book-rules");

function createApp({ readDb, writeDb, config }) {
  const { studentId, studentName, secret, production = false } = config;
  const rules = studentRules(studentId);
  if (!studentName || !secret || secret.length < 32) throw new Error("Thiếu họ tên hoặc SESSION_SECRET đủ mạnh.");
  const app = express();
  const ttlMs = 86400000;
  const reader = readDb.collection("Books");
  const writer = writeDb.collection("Books");
  app.disable("x-powered-by");
  if (production) app.set("trust proxy", 1);
  app.engine("handlebars", engine({ defaultLayout: "main" }));
  app.set("view engine", "handlebars");
  app.set("views", path.join(__dirname, "../views"));
  app.use("/assets", express.static(path.join(__dirname, "../public")));
  app.get("/health", (req, res) => res.send("OK"));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));
  app.use(session({ name: "book.sid", secret,
    store: new MongoSessionStore({ readDb, writeDb, ttlMs }),
    resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, secure: production, sameSite: "lax", maxAge: ttlMs }
  }));
  app.use((req, res, next) => {
    if (!req.session.demoId) {
      req.session.demoId = randomBytes(8).toString("hex");
      req.session.startedAt = new Date().toISOString();
    }
    if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
    res.set("Cache-Control", "no-store");
    Object.assign(res.locals, { studentName, studentId, ...rules,
      demoId: req.session.demoId, startedAt: req.session.startedAt, csrfToken: req.session.csrfToken });
    next();
  });
  const money = value => new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0
  }).format(value);
  async function renderHome(req, res, options = {}) {
    const documents = await reader.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    const books = documents.map(book => ({ code: book.code, title: book.title,
      vatPercent: book.vatPercent, priceText: money(book.price), finalPriceText: money(book.finalPrice) }));
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    res.status(options.status || 200).render("home", { books, ...options });
  }
  app.get("/", (req, res) => renderHome(req, res, {
    success: req.query.saved === "1" ? "Đã lưu sách thành công." : ""
  }));
  app.post("/books", async (req, res) => {
    const body = req.body || {};
    if (typeof body.csrfToken !== "string" || body.csrfToken !== req.session.csrfToken) {
      return renderHome(req, res, { status: 403, error: "Biểu mẫu hết hiệu lực. Hãy tải lại trang." });
    }
    let book;
    try { book = prepareBook(body, rules); }
    catch (error) { return renderHome(req, res, { status: 400, error: error.message }); }
    try { await writer.insertOne(book); }
    catch (error) {
      if (error.code === 11000) return renderHome(req, res, { status: 409, error: "Mã sách đã tồn tại. Hãy dùng mã khác." });
      throw error;
    }
    res.redirect(303, "/?saved=1");
  });
  app.use((req, res) => res.status(404).send("Không tìm thấy trang."));
  app.use((error, req, res, next) => {
    console.error("Loi xu ly:", { name: error.name, code: error.code });
    if (res.headersSent) return next(error);
    res.status(error.status === 413 ? 413 : 500).send("Không xử lý được yêu cầu. Hãy kiểm tra terminal.");
  });
  return app;
}
module.exports = { createApp };
