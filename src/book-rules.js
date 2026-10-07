function studentRules(id) {
  if (!/^[A-Za-z0-9]*\d{3}$/.test(id || "")) throw new Error("MSSV không hợp lệ.");
  return { prefix: id.slice(-3), vatPercent: Number(id.slice(-1)) + 5 };
}
function prepareBook(body, rules) {
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const raw = typeof body.price === "string" ? body.price.trim() : "";
  if (!code.startsWith(rules.prefix) || !/^[A-Za-z0-9_-]{3,50}$/.test(code)) {
    throw new Error(`Mã sách phải bắt đầu bằng ${rules.prefix}, dài 3–50 ký tự, chỉ gồm chữ không dấu, số, dấu - hoặc _.`);
  }
  if (!title || title.length > 200) throw new Error("Tên sách phải có từ 1 đến 200 ký tự.");
  const price = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(price) || price > 1_000_000_000_000) {
    throw new Error("Giá phải là số nguyên từ 0 đến 1.000.000.000.000 đồng, không dùng dấu phân cách.");
  }
  return { code, title, price, vatPercent: rules.vatPercent,
    finalPrice: Math.round(price * (100 + rules.vatPercent) / 100), createdAt: new Date() };
}
module.exports = { studentRules, prepareBook };
