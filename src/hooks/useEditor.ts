import { useState, useCallback, useEffect } from 'react';
import * as githubApi from '../lib/githubApi';
import { NotificationType } from './useGithub';
import { RepoTreeItem, ActiveFile, Workspace, SidebarMode } from '../types/editor';

const buildFileTree = (paths: RepoTreeItem[], rootFolderName: string) => {
    const root: any = { [rootFolderName]: {} };
    paths.forEach(item => {
        let current = root[rootFolderName];
        item.path.split('/').forEach(part => {
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        });
        current.__isLeaf = true;
        current.__itemData = item;
    });
    return root;
};

export const useEditor = () => {
    const [token, setToken] = useState<string>('');
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('git');
    
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [structuredTree, setStructuredTree] = useState({});

    const [openFiles, setOpenFiles] = useState<ActiveFile[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
    
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<NotificationType | null>(null);
    
    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);

    const resetWorkspace = () => {
        setWorkspace(null);
        setStructuredTree({});
        setOpenFiles([]);
        setActiveFilePath(null);
        setStagedFiles(new Set());
    };

    const handleCloneRepo = useCallback(async (repoPath: string, branchName: string) => {
        if (!repoPath) {
            setNotification({ message: 'Repository path is required.', type: 'error' });
            return;
        }
        setIsLoading(true);
        resetWorkspace();
        try {
            const [owner, repo] = repoPath.split('/');
            const data = await githubApi.scanRepoTree(repoPath, branchName, token);
            const filesOnly = data.tree.filter((item: any) => item.type === 'blob');
            
            const newWorkspace: Workspace = {
                owner, repo, branch: branchName, isCloned: true, tree: filesOnly
            };

            setWorkspace(newWorkspace);
            setStructuredTree(buildFileTree(filesOnly, repo));
            setSidebarMode('files');
            setNotification({ message: `Repository ${repoPath} cloned successfully.`, type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const handleFileSelect = useCallback(async (path: string) => {
        if (!workspace) return;
        
        const existingFile = openFiles.find(f => f.path.toLowerCase() === path.toLowerCase());
        if (existingFile) {
            setActiveFilePath(existingFile.path);
            return;
        }

        setIsLoading(true);
        try {
            const content = await githubApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
            const newFile: ActiveFile = { path, content, originalContent: content };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (error) {
            setNotification({ message: `Failed to open ${path}: ${(error as Error).message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspace, token, openFiles]);

    const handleContentChange = (path: string, newContent: string) => {
        setOpenFiles(files => files.map(f => f.path === path ? { ...f, content: newContent } : f));
    };

    const handleSave = () => {
        if (!activeFilePath) return;
        setOpenFiles(files => files.map(f => f.path === activeFilePath ? { ...f, originalContent: f.content } : f));
        setStagedFiles(prev => new Set(prev).add(activeFilePath));
        setNotification({ message: `${activeFilePath.split('/').pop()} saved locally.`, type: 'success' });
    };

    const handleCommit = useCallback(async (commitMessage: string) => {
        if (!workspace || stagedFiles.size === 0) return;

        setIsLoading(true);
        try {
            const filesToCommit = openFiles.filter(f => stagedFiles.has(f.path));
            const githubFiles = filesToCommit.map(f => ({
                name: f.path.split('/').pop() || '',
                path: f.path,
                content: f.content,
                commitType: 'feat', 
                commitMessage
            }));
            
            await githubApi.commitMultipleFiles(`${workspace.owner}/${workspace.repo}`, workspace.branch, token, githubFiles);
            setNotification({ message: `${filesToCommit.length} file(s) committed successfully!`, type: 'success' });
            setStagedFiles(new Set());

        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspace, token, openFiles, stagedFiles]);
    
    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        token, setToken,
        sidebarMode, setSidebarMode,
        workspace,
        structuredTree,
        openFiles, activeFile,
        stagedFiles,
        isLoading,
        notification, setNotification,
        handleCloneRepo,
        handleFileSelect,
        handleContentChange,
        handleSave,
        handleCommit,
        setActiveFilePath,
        handleCloseFile: (path: string) => {
            setOpenFiles(files => files.filter(f => f.path !== path));
            if (activeFilePath === path) {
                const remaining = openFiles.filter(f => f.path !== path);
                setActiveFilePath(remaining.length > 0 ? remaining[0].path : null);
            }
        },
    };
};