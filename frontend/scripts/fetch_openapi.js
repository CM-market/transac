/**
 * Fetches the latest openapi.json from the transac backend and writes it to the project root.
 * Overwrites any existing openapi.json file.
 * If the remote fetch fails, falls back to the local openapi.json.
 * Throws an error only if both remote and local are unavailable.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Change this to the correct eventserver OpenAPI endpoint if needed
const OPENAPI_URL =
  process.env.EVENTSERVER_OPENAPI_URL ||
  "http://localhost:3001/api-docs/openapi.json";
const OUTPUT_PATH = process.env.OPENAPI_OUTPUT_PATH || "./openapi.json";
const LOCAL_PATH = path.resolve(__dirname, "..", "openapi.json");

function fetchRemoteOpenApiJson(openapiUrl) {
  const protocol = openapiUrl.startsWith("https:") ? https : http;

  return new Promise((resolve, reject) => {
    protocol
      .get(openapiUrl, (res) => {
        if (res.statusCode !== 200) {
          console.error(
            `[ERROR] Remote fetch failed with status.: ${res.statusCode} ${res.statusMessage}`,
          );
          reject(
            new Error(
              `Failed to fetch openapi.json: ${res.statusCode} ${res.statusMessage}`,
            ),
          );
          return;
        }

        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log(
            `[INFO] Remote fetch succeeded with status: ${res.statusCode} ${res.statusMessage}`,
          );
          resolve(data);
        });
      })
      .on("error", (err) => {
        console.error(`[ERROR] Error during remote fetch: ${err.message}`);
        reject(new Error(`Error fetching openapi.json: ${err.message}`));
      });
  });
}

async function fetchAndSaveOpenApiJson() {
  console.log("========== fetch_openapi.js: Script started ==========");
  console.log(`[INFO] OPENAPI_URL: ${OPENAPI_URL}`);
  try {
    console.log(
      `[INFO] Attempting to fetch remote OpenAPI spec from: ${OPENAPI_URL}`,
    );
    const data = await fetchRemoteOpenApiJson(OPENAPI_URL);
    fs.writeFileSync(OUTPUT_PATH, data, "utf8");
    console.log(
      `[SUCCESS] Remote fetch succeeded. Saved openapi.json to ${OUTPUT_PATH}`,
    );
  } catch (remoteErr) {
    console.warn(`[WARN] Remote fetch failed: ${remoteErr.message}`);
    console.log("[INFO] Attempting to use local openapi.json as fallback...");
    try {
      if (!fs.existsSync(LOCAL_PATH)) {
        throw new Error("Local openapi.json not found.");
      }
      const localData = fs.readFileSync(LOCAL_PATH, "utf8");
      fs.writeFileSync(OUTPUT_PATH, localData, "utf8");
      console.log(
        `[SUCCESS] Used local openapi.json and saved to ${OUTPUT_PATH}`,
      );
    } catch (localErr) {
      console.error(
        "========== fetch_openapi.js: FINAL ERROR ==========\n" +
          `Failed to fetch openapi.json from both remote and local sources.\n` +
          `Remote error: ${remoteErr.message}\n` +
          `Local error: ${localErr.message}`,
      );
      process.exit(1);
    }
  }
}

fetchAndSaveOpenApiJson();
