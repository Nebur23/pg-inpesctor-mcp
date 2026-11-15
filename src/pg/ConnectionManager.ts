import postgres from "postgres";
import fs from "fs";
import path from "path";
import os from "os";

export class ConnectionManager {
  private pools = new Map<string, postgres.Sql>();
  private activeConnectionId: string | null = null;
  private readonly configDir: string;
  private readonly configFile: string;

  constructor() {
    this.configDir = path.join(os.homedir(), ".pg-inspector");
    this.configFile = path.join(this.configDir, "connections.json");

    this.loadConnections();

    // Graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  private loadConnections() {
    if (!fs.existsSync(this.configFile)) {
      console.error("[Warning] No connections found. Run `npx pg-inspector add-db` to configure your first database.");
      return;
    }

    try {
      const configData = fs.readFileSync(this.configFile, "utf-8");
      const connections = JSON.parse(configData);

      let loadedCount = 0;
      for (const [alias, url] of Object.entries(connections)) {
        this.addConnectionInternal(alias, url as string);
        loadedCount++;
      }

      if (loadedCount > 0) {
        console.error(`[Info] Successfully loaded ${loadedCount} database connection(s) from ${this.configFile}`);
      }
    } catch (error) {
      console.error(`[Error] Failed to parse connections config at ${this.configFile}. Please check the file format.`, error);
    }
  }

  private addConnectionInternal(alias: string, url: string) {
    if (this.pools.has(alias)) {
      console.error(`[Warning] Connection alias '${alias}' already exists. Skipping.`);
      return;
    }

    const sql = postgres(url, {
      max: 10,               // Conservative pool size
      connect_timeout: 10,   // 10 seconds to connect
      idle_timeout: 300,     // Close idle connections after 5 mins
      onnotice: (notice) => console.error(`[PG Notice] ${notice.message}`),
      onparameter: (k, v) => console.error(`[PG Param] ${k}=${v}`)
    });

    this.pools.set(alias, sql);

    // Set the first loaded connection as active
    if (!this.activeConnectionId) {
      this.activeConnectionId = alias;
    }
  }

  // Public method used by the CLI companion to add connections dynamically
  public addConnection(alias: string, url: string): string {
    this.addConnectionInternal(alias, url);

    // Persist to local config file
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    let existingConnections: Record<string, string> = {};
    if (fs.existsSync(this.configFile)) {
      try {
        existingConnections = JSON.parse(fs.readFileSync(this.configFile, "utf-8"));
      } catch {
        // Ignore parse errors, start fresh
      }
    }

    existingConnections[alias] = url;
    fs.writeFileSync(this.configFile, JSON.stringify(existingConnections, null, 2), "utf-8");

    return this.maskUrl(url);
  }

  public getActiveSql(alias?: string): postgres.Sql {
    const targetAlias = alias ?? this.activeConnectionId;
    if (!targetAlias || !this.pools.has(targetAlias)) {
      if (alias) {
        throw new Error(`Connection alias '${alias}' not found. Run 'npx pg-inspector add-db' to add it.`);
      }
      throw new Error("No active database connection. Please run `npx pg-inspector add-db` to configure a database.");
    }
    return this.pools.get(targetAlias)!;
  }

  public setActive(alias: string) {
    if (!this.pools.has(alias)) throw new Error(`Connection alias '${alias}' not found.`);
    this.activeConnectionId = alias;
  }

  public listConnections(): string[] {
    return Array.from(this.pools.keys());
  }

  private maskUrl(url: string): string {
    try {
      const u = new URL(url);
      u.password = "***";
      return u.toString();
    } catch {
      return "Invalid URL";
    }
  }

  public async shutdown() {
    console.error("[Server] Shutting down and closing all database pools...");
    for (const sql of this.pools.values()) {
      await sql.end({ timeout: 5 });
    }
    process.exit(0);
  }
}

export const dbManager = new ConnectionManager();