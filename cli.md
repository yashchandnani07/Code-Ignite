# 🔥 Code Ignite CLI Reference (`codeignite`)

Welcome to the **Code Ignite CLI** (`codeignite`). This tool is a command-line utility designed to let you interact with Code Ignite's AI generation services directly from your terminal. It scans your local workspace directory, connects to your preferred AI model provider, applies code modifications/additions/deletions automatically, previews your application locally, and deploys it live to the web.

---

## 🚀 Installation & Build

The CLI source code resides in `src/cli/` and is built into `dist/cli.js` using `esbuild`.

### 1. Build the CLI
To compile the CLI executable, run:
```bash
npm run build:cli
```
This bundles the TypeScript entry point (`src/cli/index.ts`) into `dist/cli.js` and prepends the `#!/usr/bin/env node` hashbang.

### 2. Global Linking (Optional)
To use the `codeignite` command globally on your machine:
```bash
npm link
```
Now you can invoke the CLI from any folder on your system by typing `codeignite`.

---

## ⚙️ Configuration Setup

The CLI stores its configurations in a local JSON file:
`~/.codeignite/config.json`

### Configuration Schema
The CLI supports the following configuration properties:

| Config Key | Type | Description |
|---|---|---|
| `provider` | `string` | Preferred AI API provider (`Google AI`, `OpenRouter`, `Openai`, `Claude`, `OpenAI-compatible`). |
| `apiKey` | `string` | API Authentication Key for the selected provider. |
| `model` | `string` | Default model identifier (e.g., `google/gemini-2.5-pro` for OpenRouter). |
| `githubToken` | `string` | GitHub Personal Access Token (required for Gist deployments). |
| `baseUrl` | `string` | Custom API base URL endpoint (defaults to the provider's standard endpoint). |
| `netlifyToken` | `string` | Netlify Personal Access Token (required for Netlify deployments). |
| `firebaseConfigJson` | `string` | Optional serialized JSON string containing custom Firebase credentials. |

### Environment Variables
You can also override local configuration parameters using terminal environment variables:
* `CODEIGNITE_PROVIDER`: Overrides the active AI provider.
* `CODEIGNITE_API_KEY`: Overrides the active AI API key.
* `CODEIGNITE_MODEL`: Overrides the default model.
* `CODEIGNITE_BASE_URL`: Overrides the API base URL.
* `CODEIGNITE_GITHUB_TOKEN`: Overrides the GitHub token for Gist deploys.
* `NETLIFY_AUTH_TOKEN` or `CODEIGNITE_NETLIFY_TOKEN`: Overrides the Netlify token.
* `CODEIGNITE_FIREBASE_CONFIG`: Overrides the Firebase configuration JSON string.

---

## 🛠️ Commands Reference

### 1. `login`
Configures your API keys and provider credentials interactively.
```bash
codeignite login
```
* **Description:** Launches a interactive questionnaire prompting you for your preferred provider, API keys, and deployment tokens.
* **Additional Action:** Once keys are validated, it automatically queries the provider API to fetch available models and prompts you to select your default model.

---

### 2. `chat`
Starts an interactive code-generation chat session in your terminal.
```bash
codeignite chat [prompt]
```
* **Description:** Initiates a persistent multi-turn chat session. It reads your current workspace files, sends them along with your conversation history, streams the AI response to the terminal, parses code files out of the markdown response, and writes them directly to your workspace.
* **Usage:**
  * To start a fresh interactive session: `codeignite chat`
  * To start the session with an initial prompt: `codeignite chat "Add a new counter widget"`
  * Type `exit` or `quit` to end the session.

---

### 3. `generate`
Modifies or generates files using a single non-interactive prompt.
```bash
codeignite generate <prompt>
```
* **Description:** A single-shot command. It scans the current workspace, sends the prompt, streams the code files back from the AI, updates the workspace filesystem, and exits.
* **Example:**
  ```bash
  codeignite generate "Refactor the style of index.html to use a dark theme"
  ```

---

### 4. `build`
Runs compile or build scripts for the current workspace.
```bash
codeignite build
```
* **Description:** Checks if a `package.json` file is present in the current working directory.
  * If `package.json` contains a `scripts.build` key, it executes `npm run build`.
  * If no build scripts are found, it notifies you that your project is a static site and can be previewed or deployed immediately.

---

### 5. `preview`
Runs a local static web server to preview `index.html` in the browser.
```bash
codeignite preview [options]
```
* **Options:**
  * `-p, --port <port>`: Port to run the preview server on (default: `5000`).
* **Description:** Launches a lightweight static file server in the current working directory, serving files with correct MIME headers (HTML, CSS, JS, SVG, etc.). It automatically attempts to open the server URL in your default browser.
* **Security:** Validates that incoming request paths reside within the current working directory to prevent directory traversal.

---

### 6. `deploy`
Deploys the current project folder live to the web.
```bash
codeignite deploy [options]
```
* **Options:**
  * `--provider <provider>`: Deployment provider: `"netlify"` (default) or `"gist"`.
  * `--force-new`: Create a new Netlify site even if a cached ID exists locally.
* **Netlify Deployments (`--provider netlify`):**
  * Zips the workspace files and uploads them directly via Netlify's REST API.
  * Automatically appends standard headers configuration (`_headers`) for correct MIME content-type mapping.
  * Stores the created site ID inside a local `.codeignite-site-id` file. Subsequent deploys use this ID to update the same site.
* **GitHub Gist Deployments (`--provider gist`):**
  * Flattens the workspace structure (replacing subdirectories with underscores) and pushes the code as a public Gist.
  * Provides a direct live preview link utilizing `githack.com` CDN wrappers.

---

### 7. `config`
Read, write, and list configuration settings manually.
```bash
codeignite config list
codeignite config get <key>
codeignite config set <key> <value>
```
* **Subcommands:**
  * `list`: Prints a formatted table of all configuration parameters. Sensitive values (keys and tokens) are masked.
  * `get <key>`: Prints the raw value of a single config key.
  * `set <key> <value>`: Overwrites a configuration key with a new value.

---

### 8. `models`
Lists available AI models for the configured provider.
```bash
codeignite models
```
* **Description:** Calls the current AI provider's API to fetch the list of supported models. If the server is offline or the connection fails, it falls back to a curated local list of popular models.

---

### 9. `doctor`
Diagnoses and verifies local configurations and workspace setups.
```bash
codeignite doctor
```
* **Description:** Runs self-tests to verify:
  1. The existence of the local configuration file (`~/.codeignite/config.json`).
  2. The validity of the configured AI provider credentials by executing a live connectivity test.
  3. The status of deployment tokens (Netlify and GitHub).
  4. The workspace structure (e.g. checks if `index.html` is present or if it's a Git repository).

---

### 10. `version`
Displays version details.
```bash
codeignite version
```
* **Description:** Reads the version from `package.json` and prints the active version of the CLI.

---

## 🔍 Technical Details & Scoping Rules

When scanning the workspace to send context to the AI (during `chat` or `generate`), the CLI applies the following rules:

1. **Ignored Directories:** Folders like `node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.nuxt`, `.cache`, `coverage`, and `tmp` are ignored entirely.
2. **Excluded Extensions:** Binary files and lockfiles (`.png`, `.jpg`, `.jpeg`, `.gif`, `.ico`, `.pdf`, `.zip`, `.tar`, `.gz`, `.mp4`, `.mp3`, `.wav`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.lock`, `-lock.json`, `.db`, `.sqlite`) are skipped.
3. **Size Limit:** Individual source files larger than **150KB** are ignored to protect context limits and control tokens usage.
