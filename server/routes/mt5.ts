import { Router } from "express";

const router = Router();

router.post("/sync", async (req, res) => {
    console.log("Incoming MT5 Sync");

    console.log(req.body);

    res.json({
        success: true
    });
});

export default router;