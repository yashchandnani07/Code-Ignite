import fs from "fs";
import path from "path";
import os from "os";
import { getResolvedConfig } from "../config";
import { ui } from "../ui";
import { fetchLatestModels } from "../../services/fetchModels";

export async function handleDoctor(): Promise<void> {
  ui.printHeader();
  ui.printInfo("Checking system health and configuration status...");
  ui.printDivider();

  const config = getResolvedConfig();
  let issuesCount = 0;

  // 1. Config Check
  console.log(ui.colors.bold("1. Local Configuration File"));
  const configPath = path.join(os.homedir(), ".codeignite", "config.json");
  if (fs.existsSync(configPath)) {
    ui.printSuccess(`Found config file at: ${configPath}`);
  } else {
    ui.printWarning(
      'No configuration file found. Run "codeignite login" to initialize.',
    );
    issuesCount++;
  }
  console.log();

  // 2. Active Provider & Key Verification
  console.log(ui.colors.bold("2. AI Provider Settings"));
  ui.printInfo(`Provider: ${config.provider}`);
  ui.printInfo(`Model:    ${config.model}`);

  if (!config.apiKey && config.provider !== "OpenRouter") {
    ui.printError(
      "API Key is missing. The CLI agent will not be able to generate code.",
    );
    issuesCount++;
  } else {
    ui.printSuccess("API Key is set in configuration.");

    // Validate Key connection
    const spinner = ui.createSpinner(
      "Testing connection to AI Provider API...",
    );
    spinner.start();
    try {
      const res = await fetchLatestModels(
        config.provider,
        config.apiKey,
        config.baseUrl,
      );
      spinner.stop();
      if (res.models && res.models.length > 0) {
        ui.printSuccess(
          "Successfully connected to AI Provider API! Key is valid.",
        );
      } else {
        throw new Error("Received empty models listing.");
      }
    } catch (error) {
      spinner.stop();
      ui.printError(
        `API connection test failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      ui.printWarning(
        "Please verify your API key, internet connection, or base URL override.",
      );
      issuesCount++;
    }
  }
  console.log();

  // 3. Deployment Keys
  console.log(ui.colors.bold("3. Deployment Setup"));
  if (config.netlifyToken) {
    ui.printSuccess("Netlify deployment token is set.");
  } else {
    ui.printInfo("Netlify deployment token is unset (optional).");
  }
  if (config.githubToken) {
    ui.printSuccess("GitHub Gist deployment token is set.");
  } else {
    ui.printInfo("GitHub deployment token is unset (optional).");
  }
  console.log();

  // 4. Project Directory Status
  console.log(ui.colors.bold("4. Local Workspace Status"));
  const currentDir = process.cwd();
  ui.printInfo(`Current Directory: ${currentDir}`);

  const indexExists = fs.existsSync(path.join(currentDir, "index.html"));
  if (indexExists) {
    ui.printSuccess(
      "Found index.html (Valid Code Ignite workspace entry point).",
    );
  } else {
    ui.printInfo(
      "No index.html found. Ready to generate a new project in this directory.",
    );
  }

  const hasGit = fs.existsSync(path.join(currentDir, ".git"));
  if (hasGit) {
    ui.printSuccess("Directory is a Git repository.");
  } else {
    ui.printInfo("Directory is not a Git repository (optional).");
  }
  console.log();

  // 5. Final Diagnostic
  ui.printDivider();
  if (issuesCount === 0) {
    ui.printSuccess("Doctor Diagnostic: All clear! Code Ignite is ready.");
  } else {
    ui.printWarning(
      `Doctor Diagnostic: Found ${issuesCount} potential issue(s). Run "codeignite login" to resolve config issues.`,
    );
  }
  console.log();
}
