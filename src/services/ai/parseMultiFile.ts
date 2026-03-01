import type { FileSystem } from '../../types';

const FILE_MARKER = /^=== FILE: (.+?) ===/m;
const END_MARKER = '=== END PROJECT ===';

// Split pattern — every line that opens a FILE or DELETE section
const SECTION_SPLIT = /^(?==== (?:FILE|DELETE): )/m;

/**
 * Detects whether an AI response contains a multi-file project format.
 * The trigger is the presence of any "=== FILE: <path> ===" marker.
 */
export function isMultiFileResponse(raw: string): boolean {
    return FILE_MARKER.test(raw);
}

/**
 * Parses a multi-file AI response into a flat FileSystem map.
 *
 * Expected format:
 *   === FILE: index.html ===
 *   [content]
 *   === FILE: css/style.css ===
 *   [content]
 *   === DELETE: old.js ===
 *   === END PROJECT ===
 *
 * @returns An object with:
 *   - files: Record<string, string> — parsed file contents
 *   - deletions: string[] — paths marked for deletion
 *   - summary: string — any text before the first FILE marker (used as chat summary)
 */
export function parseMultiFileResponse(raw: string): {
    files: FileSystem;
    deletions: string[];
    summary: string;
} {
    const files: FileSystem = {};
    const deletions: string[] = [];

    // Strip the END marker
    const cleaned = raw.replace(END_MARKER, '').trim();

    // Extract summary — everything before the first FILE or DELETE marker
    const firstMarkerIndex = cleaned.search(/^=== (?:FILE|DELETE):/m);
    const summary = firstMarkerIndex > 0
        ? cleaned.slice(0, firstMarkerIndex).trim()
        : '';

    // Split into sections on every line that starts a FILE or DELETE block
    const sections = cleaned.split(SECTION_SPLIT);

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        // ── DELETE marker ───────────────────────────────────────────
        const deleteMatch = trimmed.match(/^=== DELETE: (.+?) ===/);
        if (deleteMatch) {
            const path = deleteMatch[1].trim();
            if (path) deletions.push(normalizePath(path));
            continue;
        }

        // ── FILE marker ─────────────────────────────────────────────
        const fileMatch = trimmed.match(/^=== FILE: ([^=]+?) ===\s*\n?([\s\S]*)$/);
        if (fileMatch) {
            const path = fileMatch[1].trim();
            const content = fileMatch[2].replace(END_MARKER, '').trim();

            // Safety guard: reject paths that look like mis-parsed DELETE directives
            if (!path || path.toUpperCase().startsWith('DELETE:')) {
                const innerPath = path.replace(/^DELETE:\s*/i, '').trim();
                if (innerPath) deletions.push(normalizePath(innerPath));
                continue;
            }

            files[normalizePath(path)] = content;
        }
    }

    return { files, deletions, summary };
}

/**
 * Normalizes a file path:
 * - Removes leading "./" or "/"
 * - Converts backslashes to forward slashes
 */
function normalizePath(path: string): string {
    return path
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\//, '');
}
