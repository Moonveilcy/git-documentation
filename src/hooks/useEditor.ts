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

    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);

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
            const content = await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
            const newFile: ActiveFile = { path, content: content ?? '', originalContent: content ?? '' };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (error) {
            setNotification({ message: `Failed to open ${path}: ${(error as Error).message}`, type: 'error' });
        } finally {
            setIsOpeningFile(null);
        }
    }, [workspace, token, openFiles]);
    
    const handleContentChange = useCallback((path: string, newContent: string) => {
        setOpenFiles(files => files.map(f => f.path === path ? { ...f, content: newContent } : f));
    }, []);

    const handleCloseFile = (path: string) => {
        setOpenFiles(files => files.filter(f => f.path !== path));
        setStagedFiles(prev => {
            const next = new Set(prev);
            next.delete(path);
            return next;
        });
        if (activeFilePath === path) {
            const remaining = openFiles.filter(f => f.path !== path);
            setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
        }
    };
    
    const handleSave = () => {
        if (!activeFilePath) return;
        const currentFile = openFiles.find(f => f.path === activeFilePath);
        if (currentFile && currentFile.content !== currentFile.originalContent) {
             setOpenFiles(files => files.map(f => 
                f.path === activeFilePath ? { ...f, originalContent: f.content, isNew: false } : f
            ));
            setStagedFiles(prev => new Set(prev).add(activeFilePath));
            setNotification({ message: `${activeFilePath.split('/').pop()} saved locally.`, type: 'success' });
        }
    };

    const handleCommit = useCallback(async (commitMessage: string) => {
        if (!workspace || stagedFiles.size === 0) return;
        setIsLoading(true);
        try {
            const filesToCommit = openFiles
                .filter(f => stagedFiles.has(f.path))
                .map(f => ({ path: f.path, content: f.content }));
            
            await editorApi.commitFiles(`${workspace.owner}/${workspace.repo}`, workspace.branch, token, filesToCommit, commitMessage);
            
            setOpenFiles(prev => prev.map(f => stagedFiles.has(f.path) ? { ...f, originalContent: f.content } : f));
            setStagedFiles(new Set());
            setNotification({ message: `${filesToCommit.length} file(s) committed.`, type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspace, token, openFiles, stagedFiles]);
    
    const handleCreateNode = (path: string, type: 'file' | 'folder') => {
        setNotification({ message: `Create ${type} is not yet implemented.`, type: 'error' });
    };
    const handleRenameNode = (path: string) => {
        setNotification({ message: `Rename is not yet implemented.`, type: 'error' });
    };
    const handleDeleteNode = (path: string) => {
        setNotification({ message: `Delete is not yet implemented.`, type: 'error' });
    };

    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        token, setToken, workspace, structuredTree, openFiles, activeFile, stagedFiles, sidebarMode, setSidebarMode,
        isLoading, isOpeningFile, notification, setNotification, expandedFolders,
        handleCloneRepo, handleFileSelect, handleContentChange, handleCloseFile, handleSave, handleCommit, setActiveFilePath, toggleFolder,
        handleCreateNode, handleRenameNode, handleDeleteNode
    };
};