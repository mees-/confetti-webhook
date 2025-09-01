import { LinearWebhookClient } from "@linear/sdk/webhooks"
import env from "./env"

const webhookClient = new LinearWebhookClient(env.LINEAR_WEBHOOK_SECRET)

// Store all connected WebSocket clients
const connectedClients = new Set<Bun.ServerWebSocket<unknown>>()

const handler = webhookClient.createHandler()
handler.on("Issue", event => {
  if (event.action === "update" && event.data.state.type === "completed" && event.updatedFrom!.type !== "completed") {
    console.log(`Issue ${event.data.title} completed`)

    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send("confetti")
      }
    })
  }
})

Bun.serve({
  port: env.PORT,
  fetch(req, server) {
    const url = new URL(req.url)

    if (url.pathname === "/confetti") {
      return handler(req)
    }

    if (url.pathname === "/ws") {
      // Upgrade the request to a WebSocket connection
      const upgraded = server.upgrade(req)
      if (upgraded) {
        return undefined
      }
      return new Response("WebSocket upgrade failed", { status: 500 })
    }

    return new Response("Not found", { status: 404 })
  },
  websocket: {
    open(ws) {
      console.log("WebSocket client connected")
      connectedClients.add(ws)
    },
    close(ws) {
      console.log("WebSocket client disconnected")
      connectedClients.delete(ws)
    },
    message(ws, message) {},
  },
})
