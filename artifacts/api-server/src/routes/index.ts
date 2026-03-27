import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import detectRouter from "./detect.js";
import compileRouter from "./compile.js";
import submissionsRouter from "./submissions.js";
import toolchainsRouter from "./toolchains.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(detectRouter);
router.use(compileRouter);
router.use(submissionsRouter);
router.use(toolchainsRouter);

export default router;
