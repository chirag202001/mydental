/* ────────────────────────────────────────────────────────────────
   Structured logger – thin wrapper over console that outputs JSON
   in production and pretty text in development.
   ──────────────────────────────────────────────────────────────── */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    const msg = `${prefix} ${message}`;
    if (level === "error") console.error(msg, meta ?? "");
    else if (level === "warn") console.warn(msg, meta ?? "");
    else if (level === "debug") console.debug(msg, meta ?? "");
    else console.log(msg, meta ?? "");
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
