export function logger() {
  const write = (level: "info" | "warn" | "error", values: unknown[]) => {
    const [message, ...details] = values;
    const entry = {
      level,
      timestamp: new Date().toISOString(),
      message: typeof message === "string" ? message : "siteFlow event",
      ...(details.length > 0 ? { details } : {}),
    };
    const output = JSON.stringify(entry);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.info(output);
  };

  return {
    info: (...args: unknown[]) => write("info", args),
    warn: (...args: unknown[]) => write("warn", args),
    error: (...args: unknown[]) => write("error", args),
  };
}
