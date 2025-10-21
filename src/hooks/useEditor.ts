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
    const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
    
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [notification, setNotification] = useState<NotificationType | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) {
            setToken(storedToken);
        }
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
        setStagedFiles(new Set());
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
        const existingFile = openFiles.find(f => f.path.toLowerCase() === path.toLowerCase());
        if (existingFile) {
            setActiveFilePath(existingFile.path);
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
        setStagedFiles(prev => {
            const next = new Set(prev);
            next.delete(path);
            return next;
        });
        if (activeFilePath === path) {
            const remainingFiles = openFiles.filter(f => f.path !== path);
            setActiveFilePath(remainingFiles.length > 0 ? remainingFiles[remainingFiles.length - 1].path : null);
        }
    };
    
    const handleSave = () => {
        if (!activeFilePath) return;

        setOpenFiles(files => files.map(f => 
            f.path === activeFilePath ? { ...f, originalContent: f.content } : f
        ));

        setStagedFiles(prev => new Set(prev).add(activeFilePath));
        setNotification({ message: `${activeFilePath.split('/').pop()} saved locally.`, type: 'success' });
    };

    const handleCommit = useCallback(async () => {
        const filesToCommit = openFiles.filter(f => stagedFiles.has(f.path));
        if (filesToCommit.length === 0) return;

        setIsCommitting(true);
        try {
            const githubFiles = filesToCommit.map(f => ({
                name: f.path.split('/').pop() || '',
                path: f.path,
                content: f.content,
                status: 'idle',
                commitType: 'feat',
                commitMessage: `Update ${f.path}`,
            }));

            await githubApi.commitMultipleFiles(repo, branch, token, githubFiles);
            setNotification({ message: `${filesToCommit.length} file(s) committed successfully!`, type: 'success' });
            
            setStagedFiles(new Set());

        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsCommitting(false);
        }
    }, [repo, branch, token, openFiles, stagedFiles]);

    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        token, setToken, repo, setRepo, branch, setBranch,
        structuredTree, openFiles, activeFile, stagedFiles,
        isLoadingTree, isCommitting,
        notification, setNotification,
        handleFetchTree, handleFileSelect, handleContentChange, handleCloseFile, handleSave, handleCommit, setActiveFilePath,
    };
};