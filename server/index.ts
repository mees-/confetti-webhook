import { LinearWebhookClient } from "@linear/sdk/webhooks"
import env from "./env"
const webhookClient = new LinearWebhookClient(env.LINEAR_WEBHOOK_SECRET)

const handler = webhookClient.createHandler()
handler.on("Issue", event => {
  if (event.action === "update" && event.data.state.type === "completed" && event.updatedFrom!.type !== "completed") {
    console.log(`Issue ${event.data.id} completed`)
  }
})

Bun.serve({
  routes: {
    "/confetti": handler,
  },
  port: env.PORT,
})
