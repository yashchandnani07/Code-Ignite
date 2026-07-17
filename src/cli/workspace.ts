import fs from 'fs';
import path from 'path';
import type { FileSystem } from '../types';
import { ui } from './ui';

// Folders to ignore entirely
const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    '.next',
    '.nuxt',
    '.cache',
    'coverage',
    'tmp'
]);

// Binary/lock extensions to exclude from source context
const EXCLUDED_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz',
    '.mp4', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot',
    '.lock', '-lock.json', '.db', '.sqlite'
]);

/**
 * Recursively scans the directory and reads files into a flat FileSystem mapping.
 */
export function readWorkspace(dir: string): FileSystem {
    const files: FileSystem = {};

    function scan(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                if (IGNORED_DIRS.has(entry.name)) continue;
                scan(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (EXCLUDED_EXTENSIONS.has(ext) || entry.name.endsWith('.lock') || entry.name.includes('-lock.')) {
                    continue;
                }

                // Check file size (limit to 150KB to protect LLM context limits)
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.size > 150 * 1024) continue;

                    const content = fs.readFileSync(fullPath, 'utf8');
                    files[relativePath] = content;
                } catch {
                    // Skip unreadable files
                }
            }
        }
    }

    if (fs.existsSync(dir)) {
        scan(dir);
    }
    return files;
}

/**
 * Applies updates and deletions directly to the local filesystem.
 */
export function writeWorkspace(dir: string, files: FileSystem, deletions: string[] = []): void {
    // 1. Handle additions and modifications
    Object.entries(files).forEach(([relPath, content]) => {
        const absPath = path.join(dir, relPath);
        const parentDir = path.dirname(absPath);

        const isNew = !fs.existsSync(absPath);

        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.writeFileSync(absPath, content, 'utf8');
        console.log(ui.formatFileChange(isNew ? 'add' : 'modify', relPath));
    });

    // 2. Handle deletions
    deletions.forEach(relPath => {
        const absPath = path.join(dir, relPath);
        if (fs.existsSync(absPath)) {
            try {
                fs.unlinkSync(absPath);
                console.log(ui.formatFileChange('delete', relPath));
            } catch (error) {
                ui.printWarning(`Failed to delete file: ${relPath}. ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    });
}
