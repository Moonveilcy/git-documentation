import { useState, useEffect } from 'react';
import * as editorApi from '../lib/editor/api';
import { Workspace, RepoTreeItem, ActiveFile } from '../types/editor';
import { NotificationType } from './useGithub';

// Fungsi buildFileTree dipindahkan ke sini karena hanya relevan untuk hook ini.
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
    token: string;
    // States and handlers from useFileManagement
    openFiles: ActiveFile[];
    modifiedFiles: Record<string, string | null>;
    setModifiedFiles: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
    setStagedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleFileSelect: (path: string) => Promise<void>;
    handleCloseFile: (path: string) => void;
    setActiveFilePath: (path: string | null) => void;
    setOpenFiles: React.Dispatch<React.SetStateAction<ActiveFile[]>>;
};

export const useFileSystem = ({
    workspace,
    setWorkspace,
    setNotification,
    token,
    openFiles,
    modifiedFiles,
    setModifiedFiles,
    setStagedFiles,
    handleFileSelect,
    handleCloseFile,
    setActiveFilePath,
    setOpenFiles,
}: UseFileSystemParams) => {
    const [structuredTree, setStructuredTree] = useState({});
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (workspace) {
            setStructuredTree(buildFileTree(workspace.tree, workspace.repo));
            if (expandedFolders.size === 0) {
                 setExpandedFolders(new Set([workspace.repo]));
            }
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
    
        // FIX: Correct path generation for root and subdirectories
        const newPath = basePath.split('/')[0] === workspace.repo ? `${basePath}/${name}` : name;
        
        // UX: Removed automatic .gitkeep creation
        if (type === 'folder') {
            // Folders don't need a RepoTreeItem, they exist implicitly
            setExpandedFolders(prev => new Set(prev).add(newPath));
            setNotification({ message: `Folder '${name}' created locally.`, type: 'success' });
            return;
        }

        const newItem: RepoTreeItem = { path: newPath, type: 'blob', sha: '', url: '' };
        
        setWorkspace({ ...workspace, tree: [...workspace.tree, newItem] });
        setModifiedFiles(prev => ({ ...prev, [newPath]: '' }));
        setStagedFiles(prev => new Set(prev).add(newPath));
        handleFileSelect(newPath);
        setNotification({ message: `File '${name}' created locally.`, type: 'success' });
    };

    const handleDeleteNode = (path: string) => {
        // UX: Removed confirm() dialog for a faster workflow
        if (!workspace) return;
    
        const pathsToDelete = new Set<string>();
        const newTree = workspace.tree.filter(item => {
            if (item.path === path || item.path.startsWith(`${path}/`)) {
                pathsToDelete.add(item.path);
                return false; // Remove from tree
            }
            return true; // Keep in tree
        });

        if (pathsToDelete.size === 0) return;

        setWorkspace({ ...workspace, tree: newTree });

        setModifiedFiles(prev => {
            const next = {...prev};
            pathsToDelete.forEach(p => { next[p] = null; });
            return next;
        });
        setStagedFiles(prev => new Set([...prev, ...pathsToDelete]));

        pathsToDelete.forEach(p => handleCloseFile(p));
        setNotification({ message: `'${path.split('/').pop()}' deleted locally.`, type: 'info' });
    };
    
    const handleRenameNode = (oldPath: string) => {
        const oldName = oldPath.split('/').pop() || '';
        const newName = prompt(`Enter new name for ${oldName}:`, oldName);
        if (!newName || !workspace || newName === oldName) return;
    
        const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
        
        let contentToMove: Record<string, string | null> = {};
        const stagedPathsToAdd = new Set<string>();
        
        const newTree = workspace.tree.map(item => {
            if (item.path === oldPath || item.path.startsWith(`${oldPath}/`)) {
                const updatedPath = item.path.replace(oldPath, newPath);
                stagedPathsToAdd.add(item.path);
                stagedPathsToAdd.add(updatedPath);
                const currentContent = modifiedFiles[item.path] ?? openFiles.find(f => f.path === item.path)?.content;
                if (currentContent !== undefined) {
                    contentToMove[item.path] = null;
                    contentToMove[updatedPath] = currentContent;
                }
                return { ...item, path: updatedPath };
            }
            return item;
        });
        
        setWorkspace({ ...workspace, tree: newTree });
        setModifiedFiles(prev => ({ ...prev, ...contentToMove }));
        setStagedFiles(prev => new Set([...prev, ...stagedPathsToAdd]));

        const openFileUpdates = openFiles.map(f => {
            if (f.path.startsWith(oldPath)) {
                return { ...f, path: f.path.replace(oldPath, newPath) };
            }
            return f;
        });
        setOpenFiles(openFileUpdates);

        const isFolder = !workspace.tree.some(item => item.path === oldPath && item.type === 'blob');
        if (isFolder) {
            setExpandedFolders(prev => {
                const next = new Set(prev);
                if (next.has(oldPath)) {
                    next.delete(oldPath);
                    next.add(newPath);
                }
                return next;
            });
        }
        
        if (openFiles.some(f => f.path === oldPath)) {
             setActiveFilePath(newPath);
        }
        
        setNotification({ message: `Renamed to '${newName}' locally.`, type: 'success' });
    };

    const handleDownloadFile = async (path: string) => {
        if (!workspace) return;
        try {
            const content = modifiedFiles[path] ?? openFiles.find(f => f.path === path)?.content ?? await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
            if(content === null) {
                setNotification({ message: `File is marked for deletion. Cannot download.`, type: 'error' });
                return;
            }
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = path.split('/').pop() || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch(error) {
            setNotification({ message: `Failed to download file: ${(error as Error).message}`, type: 'error' });
        }
    };

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