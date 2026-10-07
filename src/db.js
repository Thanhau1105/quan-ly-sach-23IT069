require("dotenv").config();

const { MongoClient } = require("mongodb");

async function connectDatabases() {
  const studentId = process.env.STUDENT_ID || "";
  const readUri = process.env.MONGODB_READ_URI;
  const writeUri = process.env.MONGODB_WRITE_URI;

  // Chấp nhận MSSV có chữ và số, kết thúc bằng ít nhất 3 chữ số.
  if (!/^[A-Za-z0-9]*\d{3}$/.test(studentId)) {
    throw new Error("MSSV không hợp lệ.");
  }

  if (!readUri || !writeUri) {
    throw new Error("Thiếu URI đọc hoặc ghi trong file .env.");
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  };

  const readClient = new MongoClient(readUri, options);
  const writeClient = new MongoClient(writeUri, options);

  // Chờ cả hai kết nối hoàn tất trước khi xử lý kết quả.
  const results = await Promise.allSettled([
    readClient.connect(),
    writeClient.connect()
  ]);

  const failed = results.find(
    (result) => result.status === "rejected"
  );

  if (failed) {
    await Promise.allSettled([
      readClient.close(),
      writeClient.close()
    ]);

    throw failed.reason;
  }

  const databaseName = `DB_${studentId}`;

  return {
    readClient,
    writeClient,
    readDb: readClient.db(databaseName),
    writeDb: writeClient.db(databaseName)
  };
}

module.exports = { connectDatabases };