import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./create-server.js";

// Build a server instance and register its tools. serveStdio calls this
// whenever it needs an instance, so every call must return a fresh one.


void serveStdio(createServer);
console.error('pg-inspector MCP server running on stdio');