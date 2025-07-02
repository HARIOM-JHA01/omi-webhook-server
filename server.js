import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json()); 

const saveDir = path.join(__dirname, "transcripts");
if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

const getCurrentFilePath = () => {
  const now = new Date();
  const fileName = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}.txt`;
  return path.join(saveDir, fileName);
};

app.get("/health", (req, res) => {
  res.send("Api is running");
});
app.all("/omi-webhook", (req, res) => {
  const data = {
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query
  };

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${JSON.stringify(data)}\n`;

  const filePath = getCurrentFilePath();
  fs.appendFileSync(filePath, logEntry);

  res.json({ status: "received" });
});

const PORT = 11000;
app.listen(PORT, () => {
  console.log(`✅ Omi Webhook server listening on port ${PORT}`);
});
