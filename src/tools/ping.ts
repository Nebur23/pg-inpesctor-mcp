import { z } from "zod";

export const pingSchema = z.object({});

export async function pingHandler(_args: z.infer<typeof pingSchema>) {
    return {
        content: [{ type: "text" as const, text: "pong" }]
    };
}
