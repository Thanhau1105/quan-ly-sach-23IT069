const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../src/app");
const { studentRules, prepareBook } = require("../src/book-rules");

test("MSSV chữ/số, tiền tố 069, VAT 14%, kiểm tra đầu vào", () => {
  const rules = studentRules("23IT069");
  assert.deepEqual(rules, { prefix: "069", vatPercent: 14 });
  assert.equal(prepareBook({ code: "069-S001", title: "Sách", price: "100000", vatPercent: "0" }, rules).finalPrice, 114000);
  for (const body of [
    { code: "69-S001", title: "Sách", price: "100" },
    { code: "123-S001", title: "Sách", price: "100" },
    { code: "069-S001", title: " ", price: "100" },
    ...["", "-1", "1.5", "NaN", "1000000000001"].map(price => ({ code: "069-S001", title: "Sách", price }))
  ]) assert.throws(() => prepareBook(body, rules));
});

// Dữ liệu giả chỉ dành cho test; ứng dụng thật luôn dùng MongoSessionStore/Atlas.
function fixture() {
  const books = [];
  const sessions = new Map();
  const readDb = { collection(name) {
    if (name === "Books") return { find() { return {
      sort() { return this; }, limit() { return this; }, async toArray() { return books; }
    }; } };
    assert.equal(name, "sessions");
    return { async findOne(query) {
      const doc = sessions.get(query._id);
      return doc && doc.expiresAt > query.expiresAt.$gt ? structuredClone(doc) : null;
    } };
  } };
  const writeDb = { collection(name) {
    if (name === "Books") return { async insertOne(book) {
      if (books.some(existing => existing.code === book.code)) throw Object.assign(new Error("duplicate"), { code: 11000 });
      books.push(structuredClone(book));
    } };
    assert.equal(name, "sessions");
    return {
      async updateOne(query, update, options) {
        const previous = sessions.get(query._id);
        if (previous || options?.upsert) sessions.set(query._id, { ...previous, _id: query._id, ...structuredClone(update.$set) });
      },
      async deleteOne(query) { sessions.delete(query._id); }
    };
  } };
  return { readDb, writeDb, books, sessions };
}
const config = { studentId: "23IT069", studentName: "Trần Thành Hậu", secret: "test-secret-only-32-characters-long" };
async function start(data, t) {
  const server = createApp({ ...data, config }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test("HTTP: Handlebars, CSRF, thêm sách, VAT server, trùng mã, chia sẻ phiên", async t => {
  const data = fixture();
  const base = await start(data, t);
  const health = await fetch(base + "/health");
  assert.equal(await health.text(), "OK");
  assert.equal(health.headers.get("set-cookie"), null);
  const first = await fetch(base);
  const html = await first.text();
  assert.match(html, /Trần Thành Hậu/);
  assert.match(html, /14%/);
  const setCookie = first.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  const cookie = setCookie.split(";")[0];
  const token = html.match(/name="csrfToken" value="([^"]+)"/)[1];
  const demo = html.match(/Mã minh họa: <code>([^<]+)</)[1];
  const post = body => fetch(base + "/books", { method: "POST", redirect: "manual",
    headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  assert.equal((await post({ code: "069-A", title: "Sách", price: "100000" })).status, 403);
  assert.equal((await post({ csrfToken: token, code: "123-A", title: "Sách", price: "100000" })).status, 400);
  assert.equal(data.books.length, 0);
  const body = { csrfToken: token, code: "069-A", title: "<script>alert(1)</script>", price: "100000", finalPrice: "1", vatPercent: "0" };
  assert.equal((await post(body)).status, 303);
  assert.equal(data.books[0].finalPrice, 114000);
  assert.equal(data.books[0].vatPercent, 14);
  assert.equal((await post(body)).status, 409);
  assert.equal(data.books.length, 1);
  const after = await (await fetch(base, { headers: { cookie } })).text();
  assert.match(after, /&lt;script&gt;/);
  assert.ok(!after.includes("<script>alert(1)</script>"));
  const secondBase = await start(data, t);
  const secondHtml = await (await fetch(secondBase, { headers: { cookie } })).text();
  assert.ok(secondHtml.includes(demo));
  // Phiên quá hạn bị từ chối ngay, không phụ thuộc tác vụ dọn TTL.
  for (const doc of data.sessions.values()) doc.expiresAt = new Date(0);
  const expiredHtml = await (await fetch(base, { headers: { cookie } })).text();
  assert.ok(!expiredHtml.includes(demo));
});
