import { getResolvedConfig } from '../config';
import { ui } from '../ui';
import { fetchLatestModels } from '../../services/fetchModels';

export async function handleModels(): Promise<void> {
    const config = getResolvedConfig();

    if (!config.apiKey && config.provider !== 'OpenRouter') {
        ui.printError(`API Key is not configured for provider "${config.provider}". Run "codeignite login" to set it.`);
        return;
    }

    const spinner = ui.createSpinner(`Fetching active models for provider: ${config.provider}...`);
    spinner.start();

    try {
        const result = await fetchLatestModels(config.provider, config.apiKey, config.baseUrl);
        spinner.stop();

        console.log(`\nAvailable models for ${ui.colors.bold.cyan(config.provider)}:`);
        if (result.fromApi) {
            console.log(ui.colors.dim('Fetched live from the provider API:\n'));
        } else {
            console.log(ui.colors.dim('Showing curated fallback list (reason: fetch error or offline):\n'));
        }

        result.models.forEach(model => {
            console.log(`  • ${ui.colors.green(model.id)}`);
            if (model.name !== model.id || model.description) {
                const details = [
                    model.name !== model.id ? model.name : '',
                    model.description
                ].filter(Boolean).join(' - ');
                console.log(`    ${ui.colors.dim(details)}`);
            }
        });
        console.log();
    } catch (error) {
        spinner.stop();
        ui.printError(`Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`);
    }
}
