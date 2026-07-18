import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { handleLogin, handleConfig } from "./commands/login";
import { handleModels } from "./commands/models";
import { handleBuild } from "./commands/build";
import { handlePreview } from "./commands/preview";
import { handleDeploy } from "./commands/deploy";
import { handleDoctor } from "./commands/doctor";
import { handleChat, handleGenerate } from "./commands/chat";

// Find project version via import.meta.url so it works correctly in the
// compiled ESM bundle (dist/cli.js) where __dirname is not defined.
let version = "2.5.0";
try {
  const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.version) version = pkg.version;
  }
} catch {
  // Fallback to default
}

const program = new Command();

program
  .name("codeignite")
  .description("Code Ignite CLI - AI-Powered Code Generator")
  .version(version);

// 1. Chat Command
program
  .command("chat [prompt]")
  .description(
    "Start an interactive chat session or send a single prompt with conversation context",
  )
  .action(async (prompt) => {
    await handleChat(prompt);
  });

// 2. Generate Command
program
  .command("generate <prompt>")
  .description(
    "Generate or modify workspace files directly using a single prompt",
  )
  .action(async (prompt) => {
    await handleGenerate(prompt);
  });

// 3. Build Command
program
  .command("build")
  .description(
    "Run compile / build scripts for the current workspace if configured",
  )
  .action(async () => {
    await handleBuild();
  });

// 4. Preview Command
program
  .command("preview")
  .description(
    "Run a local static web server to preview index.html in the browser",
  )
  .option("-p, --port <port>", "Port to run the preview server on", "5000")
  .action(async (options) => {
    await handlePreview(options.port);
  });

// 5. Deploy Command
program
  .command("deploy")
  .description("Deploy current project folder live to Netlify or GitHub Gist")
  .option(
    "--provider <provider>",
    'Deployment provider: "netlify" or "gist"',
    "netlify",
  )
  .option("--force-new", "Create a new Netlify site even if a cached ID exists")
  .action(async (options) => {
    await handleDeploy(options);
  });

// 6. Login Command
program
  .command("login")
  .description(
    "Configure API credentials and preferred providers interactively",
  )
  .action(async () => {
    await handleLogin();
  });

// 7. Config Command
const configCmd = program
  .command("config")
  .description("Read, write, and list configuration settings manually");

configCmd
  .command("list")
  .description("List all configuration keys and values")
  .action(() => {
    handleConfig("list");
  });

configCmd
  .command("get <key>")
  .description("Get a specific configuration value")
  .action((key) => {
    handleConfig("get", key);
  });

configCmd
  .command("set <key> <value>")
  .description("Set a specific configuration value")
  .action((key, value) => {
    handleConfig("set", key, value);
  });

// 8. Models Command
program
  .command("models")
  .description("List available AI models for the configured provider")
  .action(async () => {
    await handleModels();
  });

// 9. Doctor Command
program
  .command("doctor")
  .description(
    "Diagnose and verify local credentials, configurations, and project setups",
  )
  .action(async () => {
    await handleDoctor();
  });

// 10. Explicit Version Command
program
  .command("version")
  .description("Display version details")
  .action(() => {
    console.log(`Code Ignite CLI version: ${version}`);
  });

// Parse command line arguments
program.parse(process.argv);
