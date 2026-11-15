import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const executeSafeQuerySchema = z.object({
    query: z.string().describe("The raw SQL SELECT query to execute."),
    alias: z.string().optional().describe("Optional. The pre-configured connection alias to use for this query.")
});

export async function executeSafeQueryHandler(args: z.infer<typeof executeSafeQuerySchema>) {
    const { query, alias } = args;
    try {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery.startsWith("select")) {
            return {
                content: [{ type: "text" as const, text: "Error: Only SELECT queries are allowed for safety reasons." }],
                isError: true
            };
        }

        let safeQuery = query;
        if (!trimmedQuery.includes("limit")) {
            safeQuery = `${query.trim()} LIMIT 50`;
        }

        if (alias) dbManager.setActive(alias);
        const sql = dbManager.getActiveSql();
        const result = await sql.unsafe(safeQuery);

        const MAX_ROWS = 50;
        let outputText = "";

        if (result.length > MAX_ROWS) {
            const truncated = result.slice(0, MAX_ROWS);
            outputText = JSON.stringify(truncated, null, 2);
            outputText += `\n\n[WARNING: Results truncated to ${MAX_ROWS} rows. The query returned ${result.length} rows. Please refine your query with a WHERE clause or specific columns to get more precise data.]`;
        } else {
            outputText = JSON.stringify(result, null, 2);
        }

        if (result.length === 0) {
            outputText = "Query executed successfully, but returned 0 rows.";
        }

        return {
            content: [{ type: "text" as const, text: outputText }]
        };
    } catch (error: any) {
        console.error(`[Error] execute_safe_query failed:`, error);
        return {
            content: [{ type: "text" as const, text: `Query execution failed: ${error.message}` }],
            isError: true
        };
    }
}
