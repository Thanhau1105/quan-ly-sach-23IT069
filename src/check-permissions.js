require("dotenv").config();

const { randomUUID } = require("node:crypto");
const { connectDatabases } = require("./db");

async function expectDenied(label, operation) {
  try {
    await operation();
  } catch (error) {
    const denied = error.code === 13 || (
      error.code === 8000 && /not (?:authorized|allowed)/i.test(error.message || "")
    );

    if (denied) {
      console.log(`PASS: ${label}`);
      return true;
    }

    throw error;
  }

  console.error(`FAIL: ${label} nhưng thao tác lại được phép.`);
  return false;
}

async function main() {
  const connections = await connectDatabases();
  const temporaryId = `permission-test-${randomUUID()}`;
  let passed = true;

  try {
    passed = await expectDenied(
      "Tài khoản đọc bị chặn khi insert",
      () => connections.readDb.collection("sessions").insertOne({
        _id: temporaryId,
        data: "{}",
        expiresAt: new Date(Date.now() + 60000)
      })
    ) && passed;

    // Nếu quyền đọc bị cấu hình sai và insert thành công, tài khoản ghi
    // vẫn có quyền remove trên sessions nên có thể dọn bản ghi thử nghiệm.
    await connections.writeDb.collection("sessions").deleteOne({
      _id: temporaryId
    });

    passed = await expectDenied(
      "Tài khoản ghi bị chặn khi find",
      () => connections.writeDb.collection("Books").findOne({})
    ) && passed;
  } finally {
    await Promise.allSettled([
      connections.readClient.close(),
      connections.writeClient.close()
    ]);
  }

  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Kiểm tra phân quyền thất bại:", {
    name: error.name,
    code: error.code
  });
  process.exitCode = 1;
});
