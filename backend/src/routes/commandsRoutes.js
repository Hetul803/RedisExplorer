import { Router } from "express";
import { executeCommand } from "../services/commands.js";

export function createCommandsRouter({ redis, metrics }) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const command = req.body?.command;
      const result = await executeCommand(redis, command);
      const name = Array.isArray(command)
        ? command[0]
        : String(command || "")
            .trim()
            .split(/\s+/)[0];
      const key = Array.isArray(command)
        ? command[1]
        : String(command || "")
            .trim()
            .split(/\s+/)[1];
      metrics.recordOperation(
        `COMMAND ${String(name || "").toUpperCase()}`,
        key,
      );
      res.json({ result });
    } catch (error) {
      if (error.message?.startsWith("WRONGTYPE")) error.status = 400;
      next(error);
    }
  });

  return router;
}
