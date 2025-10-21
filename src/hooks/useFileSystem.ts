import { useState, useCallback, useEffect } from 'react';
import * as editorApi from '../lib/editor/api';
import { Workspace, RepoTreeItem } from '../types/editor';
import { NotificationType } from './useGithub';

const buildFileTree = (paths: RepoTreeItem[], repoName: string) => {
    const root: any = { [repoName]: {} };
    paths.forEach(item => {
        let current = root[repoName];
        item.path.split('/').forEach((part, index, arr) => {
            if (!current[part]) current[part] = {};
            current = current[part];
            if (index === arr.length - 1 && item.type === 'blob') {
                current.__isLeaf = true;
                current.__itemData = item;
            }
        });
    });
    return root;
};

type UseFileSystemParams = {
    workspace: Workspace | null;
    setWorkspace: (workspace: Workspace | null) => void;
    setNotification: (notification: NotificationType | null) => void;
    // States and handlers from useFileManagement
    setModifiedFiles: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
    setStagedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleFileSelect: (path: string) => Promise<void>;
    handleCloseFile: (path: string) => void;
};

export const useFileSystem = ({
    workspace,
    setWorkspace,
    setNotification,
    setModifiedFiles,
    setStagedFiles,
    handleFileSelect,
    handleCloseFile,
}: UseFileSystemParams) => {
    const [structuredTree, setStructuredTree] = useState({});
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (workspace) {
            setStructuredTree(buildFileTree(workspace.tree, workspace.repo));
            setExpandedFolders(new Set([workspace.repo]));
        } else {
            setStructuredTree({});
        }
    }, [workspace]);

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const handleCreateNode = (basePath: string, type: 'file' | 'folder') => {
        const name = prompt(`Enter new ${type} name:`);
        if (!name || !workspace) return;
    
        const newPath = basePath === workspace.repo ? name : `${basePath}/${name}`;
        const itemPath = type === 'folder' ? `${newPath}/.gitkeep` : newPath;

        const newItem: RepoTreeItem = { path: itemPath, type: 'blob', sha: '', url: '' };
        
        // BUG FIX: Update workspace state to trigger re-render
        setWorkspace({ ...workspace, tree: [...workspace.tree, newItem] });

        setModifiedFiles(prev => ({ ...prev, [itemPath]: '' }));
        setStagedFiles(prev => new Set(prev).add(itemPath));
        if (type === 'file') handleFileSelect(newPath);
        setNotification({ message: `New ${type} created locally.`, type: 'info' });
    };

    const handleDeleteNode = (path: string) => {
        if (!confirm(`Are you sure you want to delete ${path}?`)) return;
        if (!workspace) return;
    
        const isFolder = !workspace.tree.find(i => i.path === path && i.type === 'blob');
        
        // BUG FIX: Update workspace state to trigger re-render
        const newTree = workspace.tree.filter(item => !item.path.startsWith(path));
        setWorkspace({ ...workspace, tree: newTree });

        // Mark all deleted files as staged for deletion
        const deletedPaths = workspace.tree.filter(item => item.path.startsWith(path)).map(i => i.path);
        setModifiedFiles(prev => {
            const next = {...prev};
            deletedPaths.forEach(p => { next[p] = null });
            return next;
        });
        setStagedFiles(prev => new Set([...prev, ...deletedPaths]));

        handleCloseFile(path);
        setNotification({ message: `${path} deleted locally.`, type: 'info' });
    };
    
    // Rename and Download can be added here following the same pattern
    const handleRenameNode = (path: string) => setNotification({ message: `Rename is not yet implemented.`, type: 'error' });
    const handleDownloadFile = (path: string) => setNotification({ message: `Download is not yet implemented.`, type: 'error' });

    return {
        structuredTree,
        expandedFolders,
        toggleFolder,
        handleCreateNode,
        handleDeleteNode,
        handleRenameNode,
        handleDownloadFile,
    };
};