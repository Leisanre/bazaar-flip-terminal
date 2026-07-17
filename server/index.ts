import express from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import { startBazaarPolling } from "./services/bazaarService.js";
import { startItemsPolling } from "./services/itemsService.js";
import { startRecipePolling } from "./services/recipeService.js";
import { startPriceHistoryTracking } from "./services/priceHistoryService.js";
import { flipsRouter } from "./routes/flipsRouter.js";
import { metaRouter } from "./routes/metaRouter.js";
import { positionsRouter } from "./routes/positionsRouter.js";
import { settingsRouter } from "./routes/settingsRouter.js";
import { loadPositions } from "./services/positionsService.js";
import { initKvStore } from "./services/kvStore.js";
import { initDiscord } from "./services/discordService.js";
import { startAlerts } from "./services/alertsService.js";

const PORT = process.env.PORT ?? 4000;

const app = express();
app.use(cors());
app.use("/api/flips", flipsRouter);
app.use("/api/meta", metaRouter);
app.use("/api/positions", positionsRouter);
app.use("/api/settings", settingsRouter);

await initKvStore();
await loadPositions();
await initDiscord();
startAlerts();

// In production the API server also serves the built dashboard, so one
// hosted URL covers everything. In dev, vite serves the client separately.
const clientDir = path.resolve("dist-client");
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

startBazaarPolling();
startItemsPolling();
startRecipePolling();
startPriceHistoryTracking();

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});
