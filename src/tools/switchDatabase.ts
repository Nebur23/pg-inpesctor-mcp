import { z } from "zod";
import { dbManager } from "../pg/ConnectionManager.js";

export const switchDatabaseSchema = z.object({
    alias: z.string().describe("The alias of the registered database connection to switch to (e.g., 'default', 'staging').")
});

export async function switchDatabaseHandler(args: z.infer<typeof switchDatabaseSchema>) {
    try {
        dbManager.setActive(args.alias);
        return {
            content: [{ type: "text" as const, text: `Active database switched to '${args.alias}'.` }]
        };
    } catch (error: any) {
        console.error(`[Error] Failed to switch database: ${error.message}`);
        return {
            content: [{ type: "text" as const, text: `Failed to switch: ${error.message}` }],
            isError: true
        };
    }
}
