import readline from "readline";
import { getResolvedConfig } from "../config";
import { ui } from "../ui";
import { readWorkspace, writeWorkspace } from "../workspace";
import { generateCodeStream } from "../../services/ai";
import type { Message } from "../../types";
import {
  isMultiFileResponse,
  parseMultiFileResponse,
} from "../../services/ai/parseMultiFile";

/**
 * Handles the single-shot generate command.
 * Scans the current directory, queries the AI, streams the response, and writes changes.
 */
export async function handleGenerate(prompt: string): Promise<void> {
  const config = getResolvedConfig();

  if (!config.apiKey && config.provider !== "OpenRouter") {
    ui.printError(
      `API Key is not configured for provider "${config.provider}". Run "codeignite login" to set it.`,
    );
    return;
  }

  const currentDir = process.cwd();
  ui.printInfo(`Scanning workspace at: ${currentDir}...`);
  const files = readWorkspace(currentDir);
  const fileCount = Object.keys(files).length;
  ui.printInfo(`Found ${fileCount} files in workspace context.`);

  ui.printDivider();
  ui.printInfo(`Sending prompt to ${config.model} (${config.provider})...`);
  console.log();

  let fullText = "";
  const messages: Message[] = [{ role: "user", content: prompt }];

  try {
    const streamResult = await generateCodeStream(
      config.apiKey,
      config.model,
      messages,
      "", // currentCode (legacy single-file, unused in multi-file)
      (chunk) => {
        process.stdout.write(chunk);
        fullText += chunk;
      },
      config.provider,
      [], // attachments
      config.baseUrl,
      files,
      "multi",
      config.firebaseConfigJson ? JSON.parse(config.firebaseConfigJson) : null,
    );

    console.log("\n"); // Clear line after streaming
    ui.printDivider();

    // Check if the response contains file markers
    if (isMultiFileResponse(fullText)) {
      const {
        files: parsedFiles,
        deletions,
        summary,
      } = parseMultiFileResponse(fullText);

      ui.printInfo("Applying changes to your workspace...");
      writeWorkspace(currentDir, parsedFiles, deletions);
      ui.printSuccess("Workspace updated successfully!");

      if (summary) {
        console.log(ui.colors.bold.cyan("\nSummary of changes:"));
        console.log(ui.colors.white(summary) + "\n");
      }
    } else if (streamResult && streamResult.summary) {
      console.log(ui.colors.bold.cyan("\nResponse Summary:"));
      console.log(ui.colors.white(streamResult.summary) + "\n");
    } else {
      ui.printWarning("AI did not return any structured file modifications.");
    }
  } catch (error) {
    console.log(); // Clear line
    ui.printError(
      `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Handles the interactive chat session, keeping track of conversation history
 * and applying file changes on each turn.
 */
export async function handleChat(initialPrompt?: string): Promise<void> {
  const config = getResolvedConfig();

  if (!config.apiKey && config.provider !== "OpenRouter") {
    ui.printError(
      `API Key is not configured for provider "${config.provider}". Run "codeignite login" to set it.`,
    );
    return;
  }

  ui.printHeader();
  ui.printInfo(
    `Starting interactive chat session with ${ui.colors.bold.cyan(config.model)}.`,
  );
  ui.printInfo(
    'Type your prompt to generate/edit files. Type "exit" or "quit" to end the session.\n',
  );

  const conversationHistory: Message[] = [];
  const currentDir = process.cwd();

  // Setup readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ui.colors.cyan("codeignite > "),
  });

  // Guard flag: prevents concurrent AI calls if the user types while generation is in progress
  let isGenerating = false;

  // Helper function to run a single turn
  async function runTurn(userPrompt: string) {
    isGenerating = true;
    const workspaceFiles = readWorkspace(currentDir);
    conversationHistory.push({ role: "user", content: userPrompt });

    console.log();
    let fullText = "";
    const spinner = ui.createSpinner("Thinking...");
    spinner.start();

    try {
      // Stop spinner before writing stream
      spinner.stop();

      const streamResult = await generateCodeStream(
        config.apiKey,
        config.model,
        conversationHistory,
        "",
        (chunk) => {
          process.stdout.write(chunk);
          fullText += chunk;
        },
        config.provider,
        [],
        config.baseUrl,
        workspaceFiles,
        "multi",
        config.firebaseConfigJson
          ? JSON.parse(config.firebaseConfigJson)
          : null,
      );

      console.log("\n"); // Clear line after stream
      ui.printDivider();

      // Save assistant turn to conversation history
      conversationHistory.push({ role: "assistant", content: fullText });

      if (isMultiFileResponse(fullText)) {
        const {
          files: parsedFiles,
          deletions,
          summary,
        } = parseMultiFileResponse(fullText);
        ui.printInfo("Applying changes to workspace...");
        writeWorkspace(currentDir, parsedFiles, deletions);
        ui.printSuccess("Files updated!");

        if (summary) {
          console.log(ui.colors.bold.cyan("\nSummary:"));
          console.log(ui.colors.white(summary));
        }
      } else if (streamResult && streamResult.summary) {
        console.log(ui.colors.bold.cyan("\nSummary:"));
        console.log(ui.colors.white(streamResult.summary));
      }
      console.log();
    } catch (error) {
      spinner.stop();
      ui.printError(
        `Error during turn: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.log();
    } finally {
      isGenerating = false;
      rl.prompt();
    }
  }

  // Process initial prompt if supplied
  if (initialPrompt) {
    console.log(`${ui.colors.cyan("codeignite > ")}${initialPrompt}`);
    await runTurn(initialPrompt);
  } else {
    rl.prompt();
  }

  rl.on("line", async (line) => {
    // Drop input that arrives while a generation is in progress
    if (isGenerating) return;

    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      rl.close();
      return;
    }

    await runTurn(trimmed);
  }).on("close", () => {
    ui.printSuccess("Interactive session ended. Goodbye!");
    process.exit(0);
  });
}
