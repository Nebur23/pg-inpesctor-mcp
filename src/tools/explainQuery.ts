import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const explainQuerySchema = z.object({
    query: z.string().describe("The raw SQL SELECT query to explain."),
    alias: z.string().optional().describe("Optional. The pre-configured connection alias to use.")
});

export async function explainQueryHandler(args: z.infer<typeof explainQuerySchema>) {
    const { query, alias } = args;
    try {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery.startsWith("select")) {
            return {
                content: [{ type: "text" as const, text: "Error: EXPLAIN is currently restricted to SELECT queries only for safety." }],
                isError: true
            };
        }

        if (alias) dbManager.setActive(alias);
        const sql = dbManager.getActiveSql();
        const plan = await sql.unsafe(`EXPLAIN (FORMAT JSON) ${query}`);

        return {
            content: [{
                type: "text" as const,
                text: `Query Plan:\n${JSON.stringify(plan[0]["QUERY PLAN"], null, 2)}\n\nNote: This is an estimated plan. Actual execution may vary based on real-time statistics.`
            }]
        };
    } catch (error: any) {
        console.error(`[Error] explain_query failed:`, error);
        return {
            content: [{ type: "text" as const, text: `Failed to generate query plan: ${error.message}` }],
            isError: true
        };
    }
}
