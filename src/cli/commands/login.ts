import inquirer from 'inquirer';
import { loadConfigFile, saveConfigFile, getResolvedConfig } from '../config';
import type { CliConfig } from '../config';
import { ui } from '../ui';
import { fetchLatestModels } from '../../services/fetchModels';
import type { ApiProvider } from '../../types';

/**
 * Handles the login command, providing an interactive prompt to set config values.
 */
export async function handleLogin(): Promise<void> {
    ui.printHeader();
    ui.printInfo('Let\'s set up your Code Ignite configuration.');

    const currentConfig = loadConfigFile();

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select your preferred AI API provider:',
            choices: ['Google AI', 'OpenRouter', 'Openai', 'Claude', 'OpenAI-compatible'],
            default: currentConfig.provider,
        },
        {
            type: 'input',
            name: 'apiKey',
            message: 'Enter your AI API Key (leave empty to keep current):',
            default: currentConfig.apiKey ? '[Key Configured]' : '',
        },
        {
            type: 'input',
            name: 'baseUrl',
            message: 'Enter custom API Base URL (optional):',
            default: currentConfig.baseUrl,
            when: (answers) => answers.provider === 'OpenAI-compatible',
        },
        {
            type: 'input',
            name: 'githubToken',
            message: 'Enter GitHub Personal Access Token (for Gist deploy, optional):',
            default: currentConfig.githubToken ? '[Token Configured]' : '',
        },
        {
            type: 'input',
            name: 'netlifyToken',
            message: 'Enter Netlify Personal Access Token (for deployments, optional):',
            default: currentConfig.netlifyToken ? '[Token Configured]' : '',
        }
    ]);

    const updates: Partial<CliConfig> = {
        provider: answers.provider as ApiProvider,
    };

    if (answers.apiKey && answers.apiKey !== '[Key Configured]') {
        updates.apiKey = answers.apiKey;
    }
    if (answers.baseUrl !== undefined) {
        updates.baseUrl = answers.baseUrl;
    }
    if (answers.githubToken && answers.githubToken !== '[Token Configured]') {
        updates.githubToken = answers.githubToken;
    }
    if (answers.netlifyToken && answers.netlifyToken !== '[Token Configured]') {
        updates.netlifyToken = answers.netlifyToken;
    }

    // Save configurations first
    saveConfigFile(updates);

    // Fetch and suggest models for the selected provider
    const activeConfig = getResolvedConfig();
    if (activeConfig.apiKey) {
        const spinner = ui.createSpinner('Fetching models list...');
        spinner.start();
        try {
            const result = await fetchLatestModels(
                activeConfig.provider,
                activeConfig.apiKey,
                activeConfig.baseUrl
            );
            spinner.stop();

            if (result.models && result.models.length > 0) {
                const modelAnswer = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'model',
                        message: 'Select the default model to use:',
                        choices: result.models.map(m => ({ name: `${m.name} (${m.description || m.id})`, value: m.id })),
                        default: currentConfig.model,
                    }
                ]);
                saveConfigFile({ model: modelAnswer.model });
                ui.printSuccess(`Model configured: ${modelAnswer.model}`);
            }
        } catch (error) {
            spinner.stop();
            ui.printWarning(`Could not fetch models automatically. Using fallback default model.`);
        }
    }

    ui.printSuccess('Configuration saved successfully to ~/.codeignite/config.json!');
}

/**
 * Handles showing, getting, and setting configuration items manually.
 */
export function handleConfig(action: 'get' | 'set' | 'list', key?: string, value?: string): void {
    if (action === 'list') {
        const config = loadConfigFile();
        console.log(ui.colors.bold.cyan('\nCode Ignite Local Configuration:'));
        Object.entries(config).forEach(([k, v]) => {
            const maskedVal = (k.toLowerCase().includes('key') || k.toLowerCase().includes('token')) && v 
                ? '*********' 
                : v;
            console.log(`  ${ui.colors.green(k)}: ${maskedVal || ui.colors.dim('(unset)')}`);
        });
        console.log();
        return;
    }

    if (action === 'get') {
        if (!key) {
            ui.printError('Missing configuration key.');
            return;
        }
        const config = loadConfigFile();
        const configVal = (config as any)[key];
        if (configVal === undefined) {
            ui.printError(`Unknown config key: "${key}"`);
        } else {
            console.log(configVal);
        }
        return;
    }

    if (action === 'set') {
        if (!key || value === undefined) {
            ui.printError('Usage: codeignite config set <key> <value>');
            return;
        }
        const config = loadConfigFile();
        if ((config as any)[key] === undefined) {
            ui.printError(`Unknown config key: "${key}"`);
            return;
        }
        saveConfigFile({ [key]: value });
        ui.printSuccess(`Config "${key}" set to "${value}"`);
    }
}
