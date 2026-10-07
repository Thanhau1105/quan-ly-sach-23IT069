require("dotenv").config();
const { connectDatabases } = require("./db");
const { createApp } = require("./app");

async function main() {
  const connections = await connectDatabases();
  let app;
  try {
    app = createApp({ ...connections, config: {
      studentId: process.env.STUDENT_ID,
      studentName: process.env.STUDENT_NAME,
      secret: process.env.SESSION_SECRET,
      production: process.env.NODE_ENV === "production"
    } });
  } catch (error) {
    await Promise.allSettled([connections.readClient.close(), connections.writeClient.close()]);
    throw error;
  }
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server dang chay tai http://localhost:${port}`);
  });
  server.on("error", async error => {
    console.error("Loi server:", { name: error.name, code: error.code });
    await Promise.allSettled([connections.readClient.close(), connections.writeClient.close()]);
    process.exitCode = 1;
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      await Promise.allSettled([connections.readClient.close(), connections.writeClient.close()]);
      clearTimeout(timeout);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch(error => {
  console.error("Khoi dong that bai:", { name: error.name, code: error.code });
  process.exitCode = 1;
});
