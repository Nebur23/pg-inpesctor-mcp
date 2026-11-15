import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const describeTableSchema = z.object({
    table_name: z.string().describe("The exact name of the table to describe."),
    schema_name: z.string().default("public").describe("The schema of the table (default is 'public')."),
    alias: z.string().optional().describe("Optional. The pre-configured connection alias to use.")
});

export async function describeTableHandler(args: z.infer<typeof describeTableSchema>) {
    const { table_name, schema_name, alias } = args;
    try {
        if (alias) dbManager.setActive(alias);
        const sql = dbManager.getActiveSql();

        const columns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = ${schema_name} AND table_name = ${table_name}
            ORDER BY ordinal_position;
        `;

        if (columns.length === 0) {
            return {
                content: [{ type: "text" as const, text: `Table '${schema_name}.${table_name}' not found. Use 'search_schema' or 'list_available_databases' to verify the name.` }],
                isError: true
            };
        }

        const constraints = await sql`
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = ${schema_name} AND tc.table_name = ${table_name};
        `;

        const indexes = await sql`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = ${schema_name} AND tablename = ${table_name};
        `;

        const tableDescription = {
            table: `${schema_name}.${table_name}`,
            columns: columns.map((col: any) => ({
                name: col.column_name,
                type: col.data_type,
                nullable: col.is_nullable === "YES",
                default: col.column_default || null
            })),
            constraints: constraints.reduce((acc: any, con: any) => {
                if (!acc[con.constraint_name]) {
                    acc[con.constraint_name] = {
                        type: con.constraint_type,
                        columns: [],
                        references: con.constraint_type === "FOREIGN KEY" ? `${con.foreign_table_name}(${con.foreign_column_name})` : null
                    };
                }
                acc[con.constraint_name].columns.push(con.column_name);
                return acc;
            }, {}),
            indexes: indexes.map((idx: any) => ({
                name: idx.indexname,
                definition: idx.indexdef
            }))
        };

        return {
            content: [{ type: "text" as const, text: JSON.stringify(tableDescription, null, 2) }]
        };
    } catch (error: any) {
        console.error(`[Error] describe_table failed:`, error);
        return {
            content: [{ type: "text" as const, text: `Error describing table: ${error.message}` }],
            isError: true
        };
    }
}
