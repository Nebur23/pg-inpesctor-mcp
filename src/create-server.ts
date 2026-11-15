import { McpServer } from "@modelcontextprotocol/server";
import { describeTableHandler, describeTableSchema } from "./tools/describeTable.js";
import { executeSafeQueryHandler, executeSafeQuerySchema } from "./tools/executeSafeQuery.js";
import { explainQueryHandler, explainQuerySchema } from "./tools/explainQuery.js";
import { getDatabaseOverviewHandler, getDatabaseOverviewSchema } from "./tools/getDatabaseOverview.js";
import { listAvailableDatabasesHandler, listAvailableDatabasesSchema } from "./tools/listAvailableDatabases.js";
import { pingHandler, pingSchema } from "./tools/ping.js";
import { searchSchemaHandler, searchSchemaSchema } from "./tools/searchSchema.js";
import { switchDatabaseHandler, switchDatabaseSchema } from "./tools/switchDatabase.js";

export function createServer(): McpServer {
    const server = new McpServer({
        name: "pg-inspector",
        version: "1.0.0",
    });

    server.registerTool(
        "ping",
        {
            description: "Ping the server to check if it is responsive.",
            inputSchema: pingSchema
        },
        pingHandler
    );

    server.registerTool(
        "list_available_databases",
        {
            description: "Lists the aliases of pre-configured database connections. Use this to know which databases you are allowed to query before running other tools.",
            inputSchema: listAvailableDatabasesSchema
        },
        listAvailableDatabasesHandler
    );

    server.registerTool(
        "switch_database",
        {
            description: "Switches the active database context to a pre-configured connection alias.",
            inputSchema: switchDatabaseSchema
        },
        switchDatabaseHandler
    );

    server.registerTool(
        "get_database_overview",
        {
            description: "Fetches schema overview (tables, columns, FKs) AND current database context metadata.",
            inputSchema: getDatabaseOverviewSchema
        },
        getDatabaseOverviewHandler
    );

    server.registerTool(
        "execute_safe_query",
        {
            description: "Executes a read-only SQL SELECT query against the active database. Automatically limits results to prevent context overflow. Use this to fetch actual data.",
            inputSchema: executeSafeQuerySchema
        },
        executeSafeQueryHandler
    );

    server.registerTool(
        "search_schema",
        {
            description: "Searches for tables or columns matching a specific keyword. Use this to find relevant tables when you don't know the exact schema structure, instead of fetching the entire database overview.",
            inputSchema: searchSchemaSchema
        },
        searchSchemaHandler
    );

    server.registerTool(
        "describe_table",
        {
            description: "Fetches comprehensive metadata for a specific table, including columns, data types, nullability, defaults, primary keys, foreign keys, and indexes. Use this before writing queries against a specific table.",
            inputSchema: describeTableSchema
        },
        describeTableHandler
    );

    server.registerTool(
        "explain_query",
        {
            description: "Generates a JSON query execution plan for a SELECT query without actually executing it. Use this to understand how PostgreSQL will process a query (e.g., index scans vs. sequential scans) and to optimize performance.",
            inputSchema: explainQuerySchema
        },
        explainQueryHandler
    );

    return server;
}
