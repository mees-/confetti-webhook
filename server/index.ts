import { LinearWebhookClient } from "@linear/sdk/webhooks"
import env from "./env"

const webhookClient = new LinearWebhookClient(env.LINEAR_WEBHOOK_SECRET)

// Store all connected WebSocket clients
const connectedClients = new Set<Bun.ServerWebSocket<unknown>>()

const handler = webhookClient.createHandler()
handler.on("Issue", event => {
  if (event.action === "update" && event.data.state.type === "completed" && event.updatedFrom!.type !== "completed") {
    console.log(`Issue ${event.data.title} completed`)

    notifyClients()
  }
})

function notifyClients() {
  console.log("Notifying clients")
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("confetti")
      console.log("Notified client")
    }
  })
}

const server = Bun.serve({
  port: env.PORT,
  hostname: "0.0.0.0",
  fetch(req, server) {
    const url = new URL(req.url)

    if (url.pathname === "/linear") {
      return handler(req)
    }
    if (url.pathname === "/confetti") {
      notifyClients()
      return new Response("OK", { status: 200 })
    }

    if (server.upgrade(req)) {
      return
    }

    return new Response("Not found", { status: 404 })
  },
  websocket: {
    open(ws) {
      console.log("WebSocket client connected")
      connectedClients.add(ws)
      console.log(`${connectedClients.size} clients connected`)
    },
    close(ws) {
      console.log("WebSocket client disconnected")
      connectedClients.delete(ws)
      console.log(`${connectedClients.size} clients connected`)
    },
    message(ws, message) {
      console.log("WebSocket client message", message)
    },
  },
})
console.log(`Server is running on ${server.url}`)
