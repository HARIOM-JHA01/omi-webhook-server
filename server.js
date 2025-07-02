import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const saveDir = path.join(__dirname, "transcripts");
if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

const getCurrentFilePath = () => {
  const now = new Date();
  const fileName = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}.txt`;
  return path.join(saveDir, fileName);
};

// Get list of all transcript files
const getTranscriptFiles = () => {
  try {
    return fs.readdirSync(saveDir).filter(file => file.endsWith(".txt"));
  } catch (error) {
    console.error("Error reading transcript directory:", error);
    return [];
  }
};

// Extract date from filename
const getDateFromFilename = (filename) => {
  const parts = filename.split("_")[0]; // "YYYY-M-D"
  return parts;
};

// Read transcript data from a file
const readTranscriptFile = (filename) => {
  try {
    const filePath = path.join(saveDir, filename);
    const content = fs.readFileSync(filePath, "utf8");
    
    // Parse each line as a JSON object with timestamp
    return content.split("\n")
      .filter(line => line.trim())
      .map(line => {
        const timestampMatch = line.match(/\[(.*?)\]/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];
          const jsonStart = line.indexOf(']') + 1;
          try {
            const jsonData = JSON.parse(line.substring(jsonStart));
            return { timestamp, content: jsonData };
          } catch (e) {
            return { timestamp, content: { error: "Invalid JSON", raw: line.substring(jsonStart) } };
          }
        }
        return null;
      })
      .filter(entry => entry !== null);
  } catch (error) {
    console.error(`Error reading transcript file ${filename}:`, error);
    return [];
  }
};

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected");
  
  // Send list of available dates
  socket.on("requestAvailableDates", () => {
    const files = getTranscriptFiles();
    const dates = [...new Set(files.map(getDateFromFilename))];
    socket.emit("availableDates", dates);
  });
  
  // Send all transcript data
  socket.on("requestAllData", () => {
    const files = getTranscriptFiles();
    let allData = [];
    
    files.forEach(file => {
      const fileData = readTranscriptFile(file);
      allData = [...allData, ...fileData];
    });
    
    // Sort by timestamp (most recent first)
    allData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    socket.emit("historicalData", allData);
  });
  
  // Send filtered transcript data
  socket.on("requestFilteredData", (date) => {
    const files = getTranscriptFiles().filter(file => file.startsWith(date));
    let filteredData = [];
    
    files.forEach(file => {
      const fileData = readTranscriptFile(file);
      filteredData = [...filteredData, ...fileData];
    });
    
    // Sort by timestamp (most recent first)
    filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    socket.emit("historicalData", filteredData);
  });
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.get("/health", (req, res) => {
  res.send("Api is running");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

  // Broadcast the new webhook data to all connected clients
  io.emit("webhookData", { timestamp, content: data });

  res.json({ status: "received" });
});

const PORT = 11000;
httpServer.listen(PORT, () => {
  console.log(`✅ Omi Webhook server listening on port ${PORT}`);
  console.log(`✅ Frontend available at http://localhost:${PORT}`);
});
