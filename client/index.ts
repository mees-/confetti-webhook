import env from "./env"
import path from "path"
import fs from "fs/promises"
import { parseArgs } from "util"
import { spawn } from "child_process"

const APP_NAME = "confetti-websocket"
const ERROR_CODES = {
  HOME_DIR_DOES_NOT_EXIST: 169,
  CONFIG_INVALID: 170,
  CONNECTION_ERROR: 171,
  DISCONNECTED: 172,
  CONFIG_FILE_CREATED: 173,
  CONFIG_FILE_NOT_FOUND: 174,
  ACCESSIBILITY_PERMISSIONS_NOT_GRANTED: 175,
}
;(async () => {
  // Parse command line arguments
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      url: {
        type: "string",
        short: "u",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
    strict: true,
    allowPositionals: true,
  })

  // Show help if requested
  if (values.help) {
    console.log("Usage: bun run index.ts [--url WEBSOCKET_URL]")
    console.log("")
    console.log("Options:")
    console.log("  --url, -u WEBSOCKET_URL    Connect to the specified WebSocket URL")
    console.log("  --help, -h                 Show this help message")
    console.log("")
    console.log("If no URL is provided, the app will read from the config file.")
    process.exit(0)
  }

  const commandLineUrl = values.url ?? null

  // If URL is provided via command line, use it directly
  if (commandLineUrl != null) {
    console.log(`Using URL from command line: ${commandLineUrl}`)
    try {
      const url = new URL(commandLineUrl)
      // Ensure it's a WebSocket URL
      if (url.protocol !== "ws:" && url.protocol !== "wss:") {
        console.error("Error: URL must use ws:// or wss:// protocol")
        process.exit(ERROR_CODES.CONFIG_INVALID)
      }
      connectToWebSocket(url)
    } catch (error) {
      console.error("Error: Invalid URL provided")
      console.error(error)
      process.exit(ERROR_CODES.CONFIG_INVALID)
    }
  } else {
    // run setup if not already run
    // get home dir
    await setupAndReadConfig()
  }

  async function setupAndReadConfig() {
    if (!(await fs.exists(env.HOME))) {
      console.error("Home directory does not exist:", env.HOME)
      process.exit(ERROR_CODES.HOME_DIR_DOES_NOT_EXIST)
    }

    const configDir = path.join(env.HOME, ".config", APP_NAME)

    if (!(await fs.exists(configDir))) {
      await fs.mkdir(configDir, { recursive: true })
      console.log("Config directory created:", configDir)
    }

    const configPath = path.join(configDir, "config.json")

    if (!(await Bun.file(configPath).exists())) {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          url: "ENTER_WEBSOCKET_URL_HERE",
        }),
      )
      console.log("Confetti-websocket config file created. Please update the url in the config file:", configPath)

      process.exit(ERROR_CODES.CONFIG_FILE_CREATED)
    }

    const config = JSON.parse(await fs.readFile(configPath, "utf-8"))

    if (!config.url) {
      console.error("URL is not set in the config file")
      process.exit(ERROR_CODES.CONFIG_INVALID)
    }
    let url: URL
    try {
      url = new URL(config.url)
      if (url.protocol !== "ws:" && url.protocol !== "wss:") {
        console.error("Error: URL must use ws:// or wss:// protocol:", config.url)
        process.exit(ERROR_CODES.CONFIG_INVALID)
      }
    } catch (error) {
      console.error("Error: Invalid URL provided:", config.url)
      process.exit(ERROR_CODES.CONFIG_INVALID)
    }

    connectToWebSocket(url)
  }

  function connectToWebSocket(url: URL) {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      console.log("Connected to the websocket")
    }

    ws.onmessage = event => {
      if (event.data === "confetti") {
        spawn("open", ["raycast://confetti"], { stdio: "inherit" })
        console.log("Sent confetti")
      }
    }

    ws.onerror = event => {
      console.error("Error connecting to the websocket")
      process.exit(ERROR_CODES.CONNECTION_ERROR)
    }

    ws.onclose = event => {
      console.error("Disconnected from the websocket")
      console.debug(event.reason)
      process.exit(ERROR_CODES.DISCONNECTED)
    }
  }
})()
