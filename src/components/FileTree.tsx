import React, { useState, useCallback } from 'react';
import {
    ChevronRight, ChevronDown, FileText, FileCog, Globe,
    Braces, Code2, FileImage, Plus, Trash2, X, Check
} from 'lucide-react';
import type { FileSystem } from '../types';

interface FileTreeProps {
    files: FileSystem;
    activeFile: string;
    onFileSelect: (path: string) => void;
    onAddFile: (path: string) => void;
    onDeleteFile: (path: string) => void;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function getFileIcon(filename: string): React.ReactNode {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const cls = 'h-3.5 w-3.5 flex-shrink-0';
    if (ext === 'html') return <Globe className={`${cls} text-orange-400`} />;
    if (ext === 'css') return <FileCog className={`${cls} text-blue-400`} />;
    if (['js', 'mjs'].includes(ext)) return <Code2 className={`${cls} text-yellow-400`} />;
    if (['ts', 'tsx', 'jsx'].includes(ext)) return <Code2 className={`${cls} text-sky-400`} />;
    if (ext === 'json') return <Braces className={`${cls} text-green-400`} />;
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext))
        return <FileImage className={`${cls} text-pink-400`} />;
    return <FileText className={`${cls} text-zinc-400`} />;
}

// ── Tree data structure ───────────────────────────────────────────────────────

interface TreeNode {
    name: string;
    fullPath: string;
    isDir: boolean;
    children: TreeNode[];
}

function buildTree(files: FileSystem): TreeNode[] {
    const root: TreeNode[] = [];
    const dirMap = new Map<string, TreeNode>();

    const getOrCreateDir = (segments: string[], pathSoFar: string): TreeNode => {
        if (dirMap.has(pathSoFar)) return dirMap.get(pathSoFar)!;
        const node: TreeNode = {
            name: segments[segments.length - 1],
            fullPath: pathSoFar,
            isDir: true,
            children: [],
        };
        dirMap.set(pathSoFar, node);
        if (segments.length === 1) {
            root.push(node);
        } else {
            const parentPath = segments.slice(0, -1).join('/');
            const parentNode = getOrCreateDir(segments.slice(0, -1), parentPath);
            parentNode.children.push(node);
        }
        return node;
    };

    const sortedPaths = Object.keys(files).sort();
    for (const path of sortedPaths) {
        const parts = path.split('/');
        if (parts.length === 1) {
            // Root-level file
            root.push({ name: parts[0], fullPath: path, isDir: false, children: [] });
        } else {
            // Nested file — ensure parent dirs exist
            const dirParts = parts.slice(0, -1);
            const dirPath = dirParts.join('/');
            const parentNode = getOrCreateDir(dirParts, dirPath);
            parentNode.children.push({
                name: parts[parts.length - 1],
                fullPath: path,
                isDir: false,
                children: [],
            });
        }
    }

    // Sort: dirs first, then files, both alphabetically
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(n => { if (n.isDir) sortNodes(n.children); });
    };
    sortNodes(root);
    return root;
}

// ── TreeNode component ────────────────────────────────────────────────────────

interface TreeNodeProps {
    node: TreeNode;
    depth: number;
    activeFile: string;
    openDirs: Set<string>;
    onToggleDir: (path: string) => void;
    onFileSelect: (path: string) => void;
    onDeleteFile: (path: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeProps> = ({
    node, depth, activeFile, openDirs, onToggleDir, onFileSelect, onDeleteFile
}) => {
    const [showDelete, setShowDelete] = useState(false);
    const isOpen = openDirs.has(node.fullPath);
    const isActive = !node.isDir && node.fullPath === activeFile;
    const indent = depth * 12;

    if (node.isDir) {
        return (
            <div>
                <button
                    onClick={() => onToggleDir(node.fullPath)}
                    className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors rounded"
                    style={{ paddingLeft: `${8 + indent}px` }}
                >
                    {isOpen
                        ? <ChevronDown className="h-3 w-3 flex-shrink-0" />
                        : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                    <span className="truncate font-medium">{node.name}/</span>
                </button>
                {isOpen && node.children.map(child => (
                    <TreeNodeItem
                        key={child.fullPath}
                        node={child}
                        depth={depth + 1}
                        activeFile={activeFile}
                        openDirs={openDirs}
                        onToggleDir={onToggleDir}
                        onFileSelect={onFileSelect}
                        onDeleteFile={onDeleteFile}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`group flex items-center gap-1.5 px-2 py-1 text-xs rounded cursor-pointer transition-colors
                ${isActive
                    ? 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            style={{ paddingLeft: `${8 + indent}px` }}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            onClick={() => onFileSelect(node.fullPath)}
        >
            {getFileIcon(node.name)}
            <span className="truncate flex-1">{node.name}</span>
            {showDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteFile(node.fullPath); }}
                    className="p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title={`Delete ${node.name}`}
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            )}
        </div>
    );
};

// ── Main FileTree component ───────────────────────────────────────────────────

const FileTree: React.FC<FileTreeProps> = ({
    files, activeFile, onFileSelect, onAddFile, onDeleteFile
}) => {
    const [openDirs, setOpenDirs] = useState<Set<string>>(new Set());
    const [addingFile, setAddingFile] = useState(false);
    const [newFilePath, setNewFilePath] = useState('');

    const toggleDir = useCallback((path: string) => {
        setOpenDirs(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    }, []);

    // Auto-open the directory containing the active file
    React.useEffect(() => {
        const parts = activeFile.split('/');
        if (parts.length > 1) {
            setOpenDirs(prev => {
                const next = new Set(prev);
                for (let i = 1; i < parts.length; i++) {
                    next.add(parts.slice(0, i).join('/'));
                }
                return next;
            });
        }
    }, [activeFile]);

    const handleAddFile = () => {
        const path = newFilePath.trim().replace(/^\//, '');
        if (path) {
            onAddFile(path);
            setNewFilePath('');
            setAddingFile(false);
        }
    };

    const nodes = buildTree(files);
    const fileCount = Object.keys(files).length;

    return (
        <div className="flex flex-col h-full bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Files <span className="text-zinc-600 font-normal">({fileCount})</span>
                </span>
                <button
                    onClick={() => setAddingFile(true)}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="New file"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* New file input */}
            {addingFile && (
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[hsl(var(--border))]">
                    <input
                        autoFocus
                        type="text"
                        value={newFilePath}
                        onChange={e => setNewFilePath(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAddFile();
                            if (e.key === 'Escape') { setAddingFile(false); setNewFilePath(''); }
                        }}
                        placeholder="e.g. css/style.css"
                        className="flex-1 text-xs bg-transparent border-b border-[hsl(var(--primary))] text-zinc-200 placeholder-zinc-600 outline-none py-0.5"
                    />
                    <button onClick={handleAddFile} className="p-0.5 text-emerald-400 hover:text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setAddingFile(false); setNewFilePath(''); }} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1 min-h-0">
                {fileCount === 0 ? (
                    <p className="text-xs text-zinc-600 text-center mt-6 px-4">No files yet</p>
                ) : (
                    nodes.map(node => (
                        <TreeNodeItem
                            key={node.fullPath}
                            node={node}
                            depth={0}
                            activeFile={activeFile}
                            openDirs={openDirs}
                            onToggleDir={toggleDir}
                            onFileSelect={onFileSelect}
                            onDeleteFile={onDeleteFile}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default FileTree;
