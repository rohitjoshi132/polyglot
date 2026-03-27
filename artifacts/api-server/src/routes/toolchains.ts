import { Router, type IRouter } from "express";
import { discoverToolchains } from "../lib/toolchains.js";

const router: IRouter = Router();

router.get("/toolchains", (_req, res) => {
  const toolchains = discoverToolchains();
  res.json({ toolchains });
});

export default router;
