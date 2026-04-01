import { Router } from "express";
import { diagnoseController } from "./consultations.controller";

const router = Router();

router.post("/api/consultations/diagnose", diagnoseController);

export default router;