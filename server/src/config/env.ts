export function getEnv() {
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  return {
    port,
    nodeEnv: process.env.NODE_ENV ?? "development",
    corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000,http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
