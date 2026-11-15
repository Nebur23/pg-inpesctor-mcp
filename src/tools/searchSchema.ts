import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const searchSchemaSchema = z.object({
    search_term: z.string().describe("The keyword to search for in table names or column names (case-insensitive)."),
    alias: z.string().optional().describe("Optional. The pre-configured connection alias to use.")
});

export async function searchSchemaHandler(args: z.infer<typeof searchSchemaSchema>) {
    const { search_term, alias } = args;
    try {
        if (alias) dbManager.setActive(alias);
        const sql = dbManager.getActiveSql();

        const results = await sql`
            SELECT
                t.table_schema,
                t.table_name,
                c.column_name,
                c.data_type
            FROM information_schema.tables t
            JOIN information_schema.columns c
                ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE t.table_type = 'BASE TABLE'
                AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
                AND (
                    t.table_name ILIKE ${`%${search_term}%`}
                    OR c.column_name ILIKE ${`%${search_term}%`}
                )
            ORDER BY t.table_schema, t.table_name, c.ordinal_position
            LIMIT 100;
        `;

        if (results.length === 0) {
            return {
                content: [{ type: "text" as const, text: `No tables or columns found matching '${search_term}'. Try a broader or different keyword.` }]
            };
        }

        const groupedResults = results.reduce((acc: any, row: any) => {
            const key = `${row.table_schema}.${row.table_name}`;
            if (!acc[key]) {
                acc[key] = { schema: row.table_schema, table: row.table_name, matching_columns: [] };
            }
            acc[key].matching_columns.push({ name: row.column_name, type: row.data_type });
            return acc;
        }, {});

        return {
            content: [{ type: "text" as const, text: `Found ${results.length} matching columns across ${Object.keys(groupedResults).length} tables:\n\n${JSON.stringify(Object.values(groupedResults), null, 2)}` }]
        };
    } catch (error: any) {
        console.error(`[Error] search_schema failed:`, error);
        return {
            content: [{ type: "text" as const, text: `Error searching schema: ${error.message}` }],
            isError: true
        };
    }
}
