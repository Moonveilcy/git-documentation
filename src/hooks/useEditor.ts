import { useState, useCallback, useEffect } from 'react';
import * as editorApi from '../lib/editor/api';
import { NotificationType } from './useGithub';
import { RepoTreeItem, ActiveFile, Workspace, SidebarMode } from '../types/editor';

const buildFileTree = (paths: RepoTreeItem[], repoName: string) => {
    const root = { [repoName]: {} };
    paths.forEach(item => {
        let current = root[repoName];
        item.path.split('/').forEach((part, index, arr) => {
            if (!current[part]) current[part] = {};
            current = current[part];
            if (index === arr.length - 1) {
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

    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);

    const updateWorkspaceTree = (newTree: RepoTreeItem[]) => {
        if (!workspace) return;
        const newWorkspace = { ...workspace, tree: newTree };
        setWorkspace(newWorkspace);
        setStructuredTree(buildFileTree(newTree, newWorkspace.repo));
    };

    const handleCloneRepo = useCallback(async (repoPath: string, branchName: string) => {
        setIsLoading(true);
        setNotification(null);
        try {
            const data = await editorApi.scanRepoTree(repoPath, branchName, token);
            if (!data || !data.tree) {
                throw new Error("Repository not found or it's empty.");
            }
            const [owner, repo] = repoPath.split('/');
            const newWorkspace: Workspace = {
                owner, repo, branch: branchName, isCloned: true, tree: data.tree
            };
            setWorkspace(newWorkspace);
            setStructuredTree(buildFileTree(data.tree, repo));
            setSidebarMode('files');
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const handleFileSelect = useCallback(async (path: string) => {
        const existingFile = openFiles.find(f => f.path.toLowerCase() === path.toLowerCase());
        if (existingFile) {
            setActiveFilePath(existingFile.path);
            return;
        }
        if (!workspace) return;
        setIsOpeningFile(path);
        try {
            const content = await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
            const newFile: ActiveFile = { path, content, originalContent: content };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (error) {
            setNotification({ message: `Failed to open ${path}: ${(error as Error).message}`, type: 'error' });
        } finally {
            setIsOpeningFile(null);
        }
    }, [workspace, token, openFiles]);
    
    const handleContentChange = (path: string, newContent: string) => {
        setOpenFiles(files => files.map(f => f.path === path ? { ...f, content: newContent } : f));
    };

    const handleCloseFile = (path: string) => {
        setOpenFiles(files => files.filter(f => f.path !== path));
        setStagedFiles(prev => { const next = new Set(prev); next.delete(path); return next; });
        if (activeFilePath === path) {
            const remaining = openFiles.filter(f => f.path !== path);
            setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
        }
    };
    
    const handleSave = () => {
        if (!activeFilePath) return;
        const currentFile = openFiles.find(f => f.path === activeFilePath);
        if (currentFile) {
             setOpenFiles(files => files.map(f => 
                f.path === activeFilePath ? { ...f, originalContent: f.content } : f
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
                .map(f => ({ path: f.path, content: f.content, isNew: f.isNew }));
            
            const payload = filesToCommit.map(f => ({
                path: f.path,
                content: f.content
            }));
            
            await editorApi.commitFiles(`${workspace.owner}/${workspace.repo}`, workspace.branch, token, payload, commitMessage);
            
            setOpenFiles(prevFiles => prevFiles.map(pf => {
                if (stagedFiles.has(pf.path)) {
                    return { ...pf, originalContent: pf.content, isNew: false };
                }
                return pf;
            }));

            setStagedFiles(new Set());
            setNotification({ message: `${filesToCommit.length} file(s) committed successfully!`, type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspace, token, openFiles, stagedFiles]);

    const handleCreateNode = (path: string, type: 'file' | 'folder') => {
        if (!workspace) return;
        const name = prompt(`Enter name for new ${type}:`);
        if (!name) return;

        const newPath = path ? `${path}/${name}` : name;

        if (type === 'folder') {
            const placeholderPath = `${newPath}/.gitkeep`;
            const newFile: ActiveFile = { path: placeholderPath, content: '', originalContent: '', isNew: true };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(placeholderPath);
            updateWorkspaceTree([...workspace.tree, { path: placeholderPath, type: 'blob', sha: '', url: '' }]);
            handleSave();
            return;
        }
        
        const newFile: ActiveFile = { path: newPath, content: '', originalContent: '', isNew: true };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(newPath);
        updateWorkspaceTree([...workspace.tree, { path: newPath, type: 'blob', sha: '', url: '' }]);
    };

    const handleRenameNode = (oldPath: string) => {
        setNotification({ message: 'Rename is not yet implemented.', type: 'error'});
    };

    const handleDeleteNode = (path: string) => {
         if (!workspace || !confirm(`Delete ${path}? This requires a direct commit.`)) return;
         setIsLoading(true);
         editorApi.commitFiles(
             `${workspace.owner}/${workspace.repo}`, workspace.branch, token,
             [{ path, content: null }],
             `chore: delete ${path}`
         ).then(() => {
             setNotification({ message: `${path} deleted.`, type: 'success' });
             updateWorkspaceTree(workspace.tree.filter(f => !f.path.startsWith(path)));
             handleCloseFile(path);
         }).catch(err => setNotification({ message: (err as Error).message, type: 'error' }))
         .finally(() => setIsLoading(false));
    };

    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        token, setToken, workspace, structuredTree, openFiles, activeFile, stagedFiles, sidebarMode, setSidebarMode,
        isLoading, isOpeningFile, notification, setNotification,
        handleCloneRepo, handleFileSelect, handleContentChange, handleCloseFile, handleSave, handleCommit, setActiveFilePath,
        handleCreateNode, handleRenameNode, handleDeleteNode
    };
};