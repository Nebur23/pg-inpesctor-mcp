#!/usr/bin/env node
import prompts from "prompts";
import fs from "fs";
import path from "path";
import os from "os";
import postgres from "postgres";

const CONFIG_DIR = path.join(os.homedir(), ".pg-inspector");
const CONFIG_FILE = path.join(CONFIG_DIR, "connections.json");

async function main() {
  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // 1. Prompt for Alias
  const aliasResponse = await prompts({
    type: "text",
    name: "alias",
    message: "Enter a short alias for this database (e.g., 'default', 'staging'):",
    validate: (value: string) => (value.length > 0 ? true : "Alias cannot be empty"),
  });

  if (!aliasResponse.alias) process.exit(0);

  // 2. Prompt for URL (masked)
  const urlResponse = await prompts({
    type: "password",
    name: "url",
    message: "Enter your PostgreSQL Connection URL:",
    validate: (value: string) => {
      if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
        return "URL must start with postgresql:// or postgres://";
      }
      return true;
    },
  });

  if (!urlResponse.url) process.exit(0);

  // 3. Test the connection immediately before saving
  console.log("\n🔄 Testing connection...");
  try {
    const sql = postgres(urlResponse.url, { max: 1, connect_timeout: 5 });
    await sql`SELECT 1`;
    await sql.end();
    console.log("✅ Connection successful!\n");
  } catch (error: any) {
    console.error(`❌ Connection failed: ${error.message}`);
    process.exit(1);
  }

  // 4. Save to config file
  let existingConnections: Record<string, string> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      existingConnections = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  existingConnections[aliasResponse.alias] = urlResponse.url;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(existingConnections, null, 2), "utf-8");

  console.log(`🎉 Successfully saved '${aliasResponse.alias}' to ${CONFIG_FILE}`);
  console.log("You can now use this database in your MCP host.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});