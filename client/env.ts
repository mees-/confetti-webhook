const homeDir = process.env.HOME

if (homeDir == null || !(typeof homeDir === "string")) {
  throw new Error("HOME is not set")
}

export default {
  HOME: homeDir,
}
