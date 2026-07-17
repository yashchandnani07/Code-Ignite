import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ui } from '../ui';

/**
 * Runs the build command. If a local package.json exists with a 'build' script,
 * runs 'npm run build'. Otherwise, reports that files are already static/ready.
 */
export async function handleBuild(): Promise<void> {
    const currentDir = process.cwd();
    const pkgPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(pkgPath)) {
        try {
            const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkgContent.scripts && pkgContent.scripts.build) {
                ui.printInfo('Build script detected in package.json. Running "npm run build"...');
                
                const spinner = ui.createSpinner('Compiling project...');
                spinner.start();

                try {
                    execSync('npm run build', { stdio: 'inherit', cwd: currentDir });
                    spinner.stop();
                    ui.printSuccess('Project built successfully!');
                } catch (execError) {
                    spinner.stop();
                    ui.printError('Build command failed. See details above.');
                }
                return;
            }
        } catch (error) {
            ui.printWarning(`Failed to parse package.json: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    ui.printInfo('No build script detected in package.json.');
    ui.printSuccess('Static site detected. No compilation required. Run "codeignite preview" to view it locally, or "codeignite deploy" to publish it.');
}
