import z from "zod"

export const env = z.object({
  LINEAR_WEBHOOK_SECRET: z.string(),
  PORT: z.number().default(3000),
})

export default env.parse(process.env)
