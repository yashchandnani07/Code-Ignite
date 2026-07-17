import chalk from 'chalk';
import ora from 'ora';

export const ui = {
    colors: chalk,

    printHeader(): void {
        console.log('\n' + chalk.bold.cyan('🔥 Code Ignite CLI') + chalk.dim(' - AI-Powered Code Generator') + '\n');
    },

    printSuccess(message: string): void {
        console.log(chalk.green('✔ ') + chalk.green(message));
    },

    printError(message: string): void {
        console.error(chalk.red('✖ ') + chalk.red.bold('Error: ') + chalk.red(message));
    },

    printWarning(message: string): void {
        console.log(chalk.yellow('⚠ ') + chalk.yellow('Warning: ') + chalk.yellow(message));
    },

    printInfo(message: string): void {
        console.log(chalk.blue('ℹ ') + chalk.blue(message));
    },

    printDivider(): void {
        console.log(chalk.dim('─'.repeat(process.stdout.columns || 50)));
    },

    createSpinner(text: string) {
        return ora({
            text,
            color: 'cyan',
            spinner: 'dots',
        });
    },

    formatFileChange(action: 'add' | 'modify' | 'delete', filepath: string): string {
        switch (action) {
            case 'add':
                return chalk.green(`  [ADD]    ${filepath}`);
            case 'modify':
                return chalk.yellow(`  [MODIFY] ${filepath}`);
            case 'delete':
                return chalk.red(`  [DELETE] ${filepath}`);
        }
    }
};
