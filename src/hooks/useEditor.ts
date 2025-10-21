import { useState, useCallback, useEffect } from 'react';
import * as editorApi from '../lib/editor/api';
import { NotificationType } from './useGithub';
import { RepoTreeItem, ActiveFile, Workspace, SidebarMode } from '../types/editor';

const buildFileTree = (paths: RepoTreeItem[], repoName: string) => {
    const root: any = { [repoName]: {} };
    paths.forEach(item => {
        let current = root[repoName];
        const parts = item.path.split('/');
        parts.forEach((part, index) => {
            if (!current[part]) current[part] = {};
            current = current[part];
            if (index === parts.length - 1 && item.type === 'blob') {
                current.__isLeaf = true;
                current.__itemData = item;
            }
        });
    });
    return root;
};

export const useEditor = () => {
    const [token, setToken] = useState('');
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [structuredTree, setStructuredTree] = useState({});
    const [openFiles, setOpenFiles] = useState<ActiveFile[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('git');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpeningFile, setIsOpeningFile] = useState<string | null>(null);
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [modifiedFiles, setModifiedFiles] = useState<Record<string, string>>({});

    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);

    const refreshFileTree = () => {
        if (workspace) {
            const tree = buildFileTree(workspace.tree, workspace.repo);
            setStructuredTree(tree);
        }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };
    
    const handleCloneRepo = useCallback(async (repoPath: string, branchName: string) => {
        setIsLoading(true);
        setNotification(null);
        setWorkspace(null);
        setStructuredTree({});
        setOpenFiles([]);
        setActiveFilePath(null);
        setStagedFiles(new Set());
        setExpandedFolders(new Set());
        setModifiedFiles({});

        try {
            const data = await editorApi.scanRepoTree(repoPath, branchName, token);
            if (!data || !data.tree) throw new Error("Repo not found or is empty.");
            
            const [owner, repo] = repoPath.split('/');
            const newWorkspace: Workspace = { owner, repo, branch: branchName, isCloned: true, tree: data.tree };
            setWorkspace(newWorkspace);
            const tree = buildFileTree(data.tree, repo);
            setStructuredTree(tree);
            setExpandedFolders(new Set([repo]));
            setSidebarMode('files');
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
            setWorkspace(null);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const handleFileSelect = useCallback(async (path: string) => {
        if (openFiles.some(f => f.path === path)) {
            setActiveFilePath(path);
            return;
        }
        if (!workspace) return;
        setIsOpeningFile(path);
        try {
            const modifiedContent = modifiedFiles[path];
            let content: string;
            let originalContent: string;

            if (modifiedContent !== undefined) {
                content = modifiedContent;
                const originalFile = workspace.tree.find(f => f.path === path);
                originalContent = originalFile ? await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token) : content;

            } else {
                const fetchedContent = await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
                content = fetchedContent ?? '';
                originalContent = fetchedContent ?? '';
            }
            
            const newFile: ActiveFile = { path, content, originalContent };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (error) {
            setNotification({ message: `Failed to open ${path}: ${(error as Error).message}`, type: 'error' });
        } finally {
            setIsOpeningFile(null);
        }
    }, [workspace, token, openFiles, modifiedFiles]);
    
    const handleContentChange = useCallback((path: string, newContent: string) => {
        setOpenFiles(files => files.map(f => f.path === path ? { ...f, content: newContent } : f));
    }, []);

    const handleCloseFile = (path: string) => {
        setOpenFiles(files => files.filter(f => f.path !== path));
        if (activeFilePath === path) {
            const remaining = openFiles.filter(f => f.path !== path);
            setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
        }
    };
    
    const handleSave = () => {
        if (!activeFilePath) return;
        const currentFile = openFiles.find(f => f.path === activeFilePath);
        if (currentFile && currentFile.content !== currentFile.originalContent) {
            setModifiedFiles(prev => ({ ...prev, [activeFilePath]: currentFile.content }));
            setStagedFiles(prev => new Set(prev).add(activeFilePath));
            setOpenFiles(files => files.map(f => f.path === activeFilePath ? { ...f, originalContent: f.content, isNew: false } : f));
            setNotification({ message: `${activeFilePath.split('/').pop()} saved in session.`, type: 'success' });
        }
    };

    const handleCommit = useCallback(async (commitMessage: string) => {
        if (!workspace || stagedFiles.size === 0) return;
        setIsLoading(true);
        try {
            const filesToCommit = Array.from(stagedFiles).map(path => ({
                path,
                content: modifiedFiles[path] ?? null
            }));
            
            await editorApi.commitFiles(`${workspace.owner}/${workspace.repo}`, workspace.branch, token, filesToCommit, commitMessage);
            
            setModifiedFiles(prev => {
                const next = { ...prev };
                stagedFiles.forEach(path => delete next[path]);
                return next;
            });

            // Refresh the entire workspace state from GitHub to reflect changes
            await handleCloneRepo(`${workspace.owner}/${workspace.repo}`, workspace.branch);

            setNotification({ message: `${filesToCommit.length} file(s) committed.`, type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspace, token, stagedFiles, modifiedFiles, handleCloneRepo]);

    const handleCreateNode = (basePath: string, type: 'file' | 'folder') => {
        const name = prompt(`Enter new ${type} name:`);
        if (!name || !workspace) return;

        const newPath = type === 'folder' 
            ? `${basePath}/${name}/.gitkeep` 
            : `${basePath}/${name}`;
        
        const content = '';

        setModifiedFiles(prev => ({...prev, [newPath]: content}));
        setStagedFiles(prev => new Set(prev).add(newPath));
        
        const newItem: RepoTreeItem = { path: newPath, type: 'blob', sha: '', url: '' };
        setWorkspace(ws => ws ? { ...ws, tree: [...ws.tree, newItem] } : null);
        
        refreshFileTree();

        if(type === 'file') {
            const newFile: ActiveFile = { path: newPath, content, originalContent: '', isNew: true };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(newPath);
        }
        setNotification({ message: `New ${type} created. Commit to save.`, type: 'info' });
    };

    const handleRenameNode = (oldPath: string) => {
        const newName = prompt(`Enter new name for ${oldPath.split('/').pop()}:`);
        if (!newName || !workspace) return;

        const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
        const content = modifiedFiles[oldPath] ?? openFiles.find(f => f.path === oldPath)?.content;
        
        if (content === undefined) {
            setNotification({ message: "Cannot rename file that is not open or modified.", type: 'error' });
            return;
        }

        // Stage old file for deletion and new file for creation
        setModifiedFiles(prev => ({ ...prev, [oldPath]: null, [newPath]: content }));
        setStagedFiles(prev => new Set(prev).add(oldPath).add(newPath));
        
        // Update workspace tree
        setWorkspace(ws => ws ? {
            ...ws,
            tree: ws.tree.filter(item => item.path !== oldPath).concat([{ path: newPath, type: 'blob', sha: '', url: '' }])
        } : null);
        
        refreshFileTree();
        
        // Update open files
        setOpenFiles(files => files.map(f => f.path === oldPath ? { ...f, path: newPath } : f));
        if (activeFilePath === oldPath) setActiveFilePath(newPath);

        setNotification({ message: `Renamed to ${newName}. Commit to save.`, type: 'info' });
    };

    const handleDeleteNode = (path: string) => {
        if (!confirm(`Are you sure you want to delete ${path}? This cannot be undone locally.`)) return;

        setModifiedFiles(prev => ({ ...prev, [path]: null }));
        setStagedFiles(prev => new Set(prev).add(path));
        
        setWorkspace(ws => ws ? { ...ws, tree: ws.tree.filter(item => item.path !== path) } : null);
        refreshFileTree();
        
        handleCloseFile(path);
        setNotification({ message: `${path} deleted. Commit to save.`, type: 'info' });
    };
    
    const handleDownloadFile = async (path: string) => {
        if (!workspace) return;
        try {
            let content = modifiedFiles[path] ?? openFiles.find(f => f.path === path)?.content;
            if (content === undefined) {
                 content = await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
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

    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        token, setToken, workspace, structuredTree, openFiles, activeFile, stagedFiles, sidebarMode, setSidebarMode,
        isLoading, isOpeningFile, notification, setNotification, expandedFolders,
        handleCloneRepo, handleFileSelect, handleContentChange, handleCloseFile, handleSave, handleCommit, setActiveFilePath, toggleFolder,
        handleCreateNode, handleRenameNode, handleDeleteNode, handleDownloadFile
    };
};