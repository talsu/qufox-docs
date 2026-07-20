#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { ENGINE_VERSION } from "../version.js";

const main = defineCommand({
  meta: {
    name: "qufox-docs",
    version: ENGINE_VERSION,
    description: "Serve a folder of Obsidian-flavored Markdown as a modern blog, live.",
  },
  subCommands: {
    serve: () => import("./serve.js").then((m) => m.serveCommand),
    build: () => import("./build.js").then((m) => m.buildCommand),
  },
});

runMain(main);
