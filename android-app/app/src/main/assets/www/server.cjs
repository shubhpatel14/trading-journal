var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
import_dotenv.default.config();
var envGeminiApiKey = process.env.GEMINI_API_KEY?.trim() || "";
var geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
var createGeminiClient = () => new import_genai.GoogleGenAI({
  apiKey: envGeminiApiKey,
  httpOptions: {
    timeout: 45e3,
    headers: {
      "User-Agent": "tradeforge-local-journal"
    }
  }
});
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const uploadsDir = import_path.default.join(process.cwd(), "assets", "uploads");
  if (!import_fs.default.existsSync(uploadsDir)) {
    import_fs.default.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/assets/uploads", import_express.default.static(uploadsDir));
  app.post("/api/upload", (req, res) => {
    try {
      const { image, name } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "No image data provided" });
      }
      const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Invalid base64 image data" });
      }
      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${name || "ss"}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = import_path.default.join(uploadsDir, filename);
      import_fs.default.writeFileSync(filePath, buffer);
      const publicUrl = `/assets/uploads/${filename}`;
      return res.json({ url: publicUrl, filename });
    } catch (err) {
      console.error("Image Upload Error:", err);
      return res.status(500).json({ error: err.message || "Failed to save screenshot" });
    }
  });
  const tradesBackupPath = import_path.default.join(process.cwd(), "trades_backup.json");
  app.get("/api/trades", (req, res) => {
    try {
      if (import_fs.default.existsSync(tradesBackupPath)) {
        const raw = import_fs.default.readFileSync(tradesBackupPath, "utf-8");
        return res.json(JSON.parse(raw));
      }
      return res.json([]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/trades", (req, res) => {
    try {
      const { trades } = req.body;
      if (Array.isArray(trades)) {
        import_fs.default.writeFileSync(tradesBackupPath, JSON.stringify(trades, null, 2), "utf-8");
        return res.json({ success: true, count: trades.length });
      }
      return res.status(400).json({ error: "Invalid trades payload" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { trades } = req.body;
      if (!trades || !Array.isArray(trades)) {
        return res.status(400).json({ error: "Missing or invalid trades list." });
      }
      if (!envGeminiApiKey) {
        return res.status(200).json({
          feedback: "Gemini is not configured yet. Open the AI Chat tab to add an API key for this server session."
        });
      }
      const tradesSummary = trades.map(
        (t, idx) => `[Trade #${idx + 1}] Date: ${t.date}, Asset: ${t.asset}, Setup: ${t.setup}, Direction: ${t.direction}, PnL: $${t.pnl}, Status: ${t.status}, Session: ${t.session}, Grade: ${t.tradeGrade || "Not graded"}, Mistakes: ${(t.mistakes || []).join(", ")}, Notes: "${t.notes || ""}"`
      ).join("\n");
      const prompt = `You are an elite, highly experienced institutional trading risk manager and trading psychology coach. 
Analyze the following logged trading journal history for this user. Locate distinct patterns and make constructive, highly tactical, actionable observations:

1. Setup Inefficiencies: Which of their setups (e.g., BoS Downside, EMA Rejection, Liquidity Sweep) are making the most consistent returns, and which ones are leaking capital?
2. Psychological/Behavioral Pitfalls: Are there specific psychological mistakes (like FOMO, overtrading, leaving wins early) that are causing losses? Contrast this with days where no mistakes were logged.
3. Session Advantages: Identify performance variance between London, New York, or Asian session executions.
4. Strategic Optimization advice: Offer 3 concrete, professional, mathematical recommendations (such as altering risk size or adjusting targets based on their average win vs. average loss sizes) to optimize performance.

User Trade Log History:
${tradesSummary}

Provide your feedback report directly. Use bold scannable headings, professional spacing, and clean bullet points. Speak in a confident, encouraging, yet elite institutional tone. Keep the review tightly focused and immediately actionable.`;
      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: prompt
      });
      res.json({ feedback: response.text });
    } catch (err) {
      console.error("AI Coach Server-Side Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI performance audit." });
    }
  });
  app.post("/api/mt5/sync", async (req, res) => {
    try {
      const scriptPath = import_path.default.join(process.cwd(), "mt5-sync", "sync.py");
      console.log("Triggering MT5 Sync via script:", scriptPath);
      const { exec } = await import("child_process");
      exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
        if (error || stdout && (stdout.includes("Initialization Failed") || stdout.includes("No MT5 deal history"))) {
          console.error("MT5 Sync Script Execution Error:", error, stderr, stdout);
          const isCloudServer = !!process.env.RENDER || process.env.NODE_ENV === "production";
          return res.status(400).json({
            error: isCloudServer ? 'Your website is hosted on Render Cloud, which cannot reach your local PC MT5 application. Please download the GitHub ZIP file from https://github.com/shubhpatel14/Journal, extract it, and run "python mt5-sync/auto_sync.py" or run the app locally on your Windows PC!' : "Could not connect to MT5. Ensure MT5 Desktop Terminal is open and logged into your account.",
            details: stdout || stderr || error?.message
          });
        }
        console.log("MT5 Sync Output:\n", stdout);
        const uploadedMatch = stdout.match(/Trades Uploaded\s*:\s*(\d+)/);
        const profitMatch = stdout.match(/Net Profit\s*:\s*([-\d.]+)/);
        const uploadedCount = uploadedMatch ? parseInt(uploadedMatch[1], 10) : 0;
        const netProfit = profitMatch ? parseFloat(profitMatch[1]) : 0;
        res.json({
          success: true,
          message: "MT5 trade synchronization completed successfully.",
          uploadedCount,
          netProfit,
          output: stdout
        });
      });
    } catch (err) {
      console.error("MT5 Sync Endpoint Error:", err);
      res.status(500).json({ error: err.message || "MT5 Sync failed." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in Development mode.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Serving production static assets from /dist.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
