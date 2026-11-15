import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const getDatabaseOverviewSchema = z.object({
    alias: z.string().optional().describe("Optional. If provided, switches to this pre-configured connection alias before fetching the overview.")
});

export async function getDatabaseOverviewHandler(args: z.infer<typeof getDatabaseOverviewSchema>) {
    const { alias } = args;
    try {
        if (alias) dbManager.setActive(alias);
        const sql = dbManager.getActiveSql();

        const meta = await sql`
            SELECT
                current_database() as db_name,
                current_user as db_user,
                version() as pg_version,
                inet_server_addr() as server_ip,
                inet_server_port() as server_port
        `;

        const tablesAndColumns = await sql`
            SELECT t.table_schema, t.table_name, c.column_name, c.data_type
            FROM information_schema.tables t
            JOIN information_schema.columns c
              ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE t.table_type = 'BASE TABLE'
              AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY t.table_schema, t.table_name, c.ordinal_position;
        `;

        const foreignKeys = await sql`
            SELECT tc.table_schema, tc.table_name, kcu.column_name,
                   ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY';
        `;

        const schemaOverview = tablesAndColumns.reduce((acc: any, row: any) => {
            const key = `${row.table_schema}.${row.table_name}`;
            if (!acc[key]) acc[key] = { schema: row.table_schema, table: row.table_name, columns: [], foreign_keys: [] };
            acc[key].columns.push({ name: row.column_name, type: row.data_type });
            return acc;
        }, {});

        foreignKeys.forEach((fk: any) => {
            const key = `${fk.table_schema}.${fk.table_name}`;
            if (schemaOverview[key]) {
                schemaOverview[key].foreign_keys.push({ column: fk.column_name, references: `${fk.foreign_table_name}(${fk.foreign_column_name})` });
            }
        });

        const activeAlias = alias || dbManager.listConnections()[0];
        const result = {
            connection_context: {
                active_connection_alias: activeAlias,
                database_name: meta[0].db_name,
                connected_as_user: meta[0].db_user,
                postgres_version: meta[0].pg_version.split(" ").slice(0, 2).join(" "),
                server_address: meta[0].server_ip ? `${meta[0].server_ip}:${meta[0].server_port}` : "Local/Hidden"
            },
            schema: Object.values(schemaOverview)
        };

        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
        };
    } catch (error: any) {
        console.error(`[Error] get_database_overview failed:`, error);
        return {
            content: [{ type: "text" as const, text: `Error fetching overview: ${error.message}` }],
            isError: true
        };
    }
}
