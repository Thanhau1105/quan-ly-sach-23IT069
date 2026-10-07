const { connectDatabases } = require("./db");

async function main() {
  const {
    readClient,
    writeClient,
    readDb,
    writeDb
  } = await connectDatabases();

  try {
    await readDb.command({ ping: 1 });
    console.log("OK: Ket noi tai khoan doc.");

    await writeDb.command({ ping: 1 });
    console.log("OK: Ket noi tai khoan ghi.");

    const books = await readDb
      .collection("Books")
      .find({})
      .limit(5)
      .toArray();

    console.log("OK: Doc duoc collection Books.");
    console.log(`So sach lay ve: ${books.length}`);
    console.log("Database:", readDb.databaseName);
  } finally {
    await Promise.allSettled([
      readClient.close(),
      writeClient.close()
    ]);
  }
}

main().catch((error) => {
  // Không in chuỗi kết nối hoặc mật khẩu ra terminal.
  console.error("Kiem tra that bai.");
  console.error("Loai loi:", error.name);
  console.error("Ma loi:", error.code || "Khong co");

  process.exitCode = 1;
});