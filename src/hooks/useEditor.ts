import { useState, useCallback, useEffect } from 'react';
import * as githubApi from '../lib/githubApi';
import { NotificationType } from './useGithub';
import { RepoTreeItem, ActiveFile } from '../types/editor';

const buildFileTree = (paths: RepoTreeItem[]) => {
    const root: any = {};
    paths.forEach(item => {
        let current = root;
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
    const [token, setToken] = useState('');
    const [repo, setRepo] = useState('');
    const [branch, setBranch] = useState('main');
    
    const [rawTree, setRawTree] = useState<RepoTreeItem[]>([]);
    const [structuredTree, setStructuredTree] = useState({});
    const [openFiles, setOpenFiles] = useState<ActiveFile[]>([]); 
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null); 
    
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<NotificationType | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);

    const handleFetchTree = useCallback(async () => {
        if (!repo || !token) {
            setNotification({ message: 'Repository and Token are required.', type: 'error' });
            return;
        }
        setIsLoadingTree(true);
        setRawTree([]);
        setStructuredTree({});
        setOpenFiles([]);
        setActiveFilePath(null);
        try {
            const data = await githubApi.scanRepoTree(repo, branch, token);
            const filesOnly = data.tree.filter((item: any) => item.type === 'blob');
            setRawTree(filesOnly);
            setStructuredTree(buildFileTree(filesOnly));
            setNotification({ message: 'Repository scanned successfully.', type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoadingTree(false);
        }
    }, [repo, branch, token]);

    const handleFileSelect = useCallback(async (path: string) => {
        if (openFiles.some(f => f.path === path)) {
            setActiveFilePath(path);
            return;
        }

        try {
            const content = await githubApi.getFileContent(repo, path, branch, token);
            const newFile: ActiveFile = { path, content, originalContent: content };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (error) {
            setNotification({ message: `Failed to open ${path}: ${(error as Error).message}`, type: 'error' });
        }
    }, [repo, branch, token, openFiles]);
    
    const handleContentChange = (path: string, newContent: string) => {
        setOpenFiles(files => files.map(f => f.path === path ? { ...f, content: newContent } : f));
    };

    const handleCloseFile = (path: string) => {
        setOpenFiles(files => files.filter(f => f.path !== path));
        if (activeFilePath === path) {
            const remainingFiles = openFiles.filter(f => f.path !== path);
            setActiveFilePath(remainingFiles.length > 0 ? remainingFiles[remainingFiles.length - 1].path : null);
        }
    };
    
    const handleSave = useCallback(async () => {
        const activeFile = openFiles.find(f => f.path === activeFilePath);
        if (!activeFile || activeFile.content === activeFile.originalContent) return;

        setIsSaving(true);
        try {
            const fileToCommit = {
                name: activeFile.path.split('/').pop() || '',
                path: activeFile.path,
                content: activeFile.content,
                status: 'idle',
                commitType: 'feat',
                commitMessage: `Update ${activeFile.path}`,
            };
            await githubApi.commitMultipleFiles(repo, branch, token, [fileToCommit]);
            setNotification({ message: `${activeFile.path} saved successfully!`, type: 'success' });
            
            setOpenFiles(files => files.map(f => f.path === activeFilePath ? { ...f, originalContent: f.content } : f));

        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [repo, branch, token, openFiles, activeFilePath]);

    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        token, setToken, repo, setRepo, branch, setBranch,
        structuredTree, openFiles, activeFile,
        isLoadingTree, isSaving,
        notification, setNotification,
        handleFetchTree, handleFileSelect, handleContentChange, handleCloseFile, handleSave, setActiveFilePath,
    };
};