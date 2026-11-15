import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const listAvailableDatabasesSchema = z.object({});

export async function listAvailableDatabasesHandler(_args: z.infer<typeof listAvailableDatabasesSchema>) {
    const aliases = dbManager.listConnections();
    if (aliases.length === 0) {
        return {
            content: [{ type: "text" as const, text: "No databases configured. Please set the DATABASE_URL environment variable in your host config." }],
            isError: true
        };
    }
    return {
        content: [{ type: "text" as const, text: `Available database aliases: ${aliases.join(", ")}` }]
    };
}
