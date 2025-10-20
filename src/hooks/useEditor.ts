import { useState, useCallback, useEffect } from 'react';
import * as githubApi from '../lib/githubApi';
import { NotificationType } from './useGithub';
import { RepoTreeItem, ActiveFile } from '../types/editor';

export const useEditor = () => {
    const [token, setToken] = useState('');
    const [repo, setRepo] = useState('');
    const [branch, setBranch] = useState('main');
    
    const [tree, setTree] = useState<RepoTreeItem[]>([]);
    const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
    const [editedContent, setEditedContent] = useState<string | null>(null);
    
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [isLoadingFile, setIsLoadingFile] = useState(false);
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
        setTree([]);
        setActiveFile(null);
        setEditedContent(null);
        try {
            const data = await githubApi.scanRepoTree(repo, branch, token);
            setTree(data.tree);
            setNotification({ message: 'Repository scanned successfully.', type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoadingTree(false);
        }
    }, [repo, branch, token]);

    const handleFileSelect = useCallback(async (path: string, sha: string) => {
        setIsLoadingFile(true);
        setActiveFile(null);
        try {
            const content = await githubApi.getFileContent(repo, path, branch, token);
            setActiveFile({ path, sha, content });
            setEditedContent(content);
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoadingFile(false);
        }
    }, [repo, branch, token]);

    const handleSave = useCallback(async () => {
        if (!activeFile || editedContent === null) return;

        setIsSaving(true);
        try {
            const commitMessage = `docs: update ${activeFile.path}`;
            const fileToCommit = {
                name: activeFile.path.split('/').pop() || '',
                path: activeFile.path,
                content: editedContent,
                status: 'idle',
                commitType: 'docs',
                commitMessage: `update ${activeFile.path}`,
            };
            await githubApi.commitMultipleFiles(repo, branch, token, [fileToCommit]);
            setNotification({ message: `${activeFile.path} saved successfully!`, type: 'success' });
            handleFileSelect(activeFile.path, activeFile.sha);
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [repo, branch, token, activeFile, editedContent, handleFileSelect]);

    return {
        token, setToken, repo, setRepo, branch, setBranch,
        tree, activeFile, editedContent, setEditedContent,
        isLoadingTree, isLoadingFile, isSaving,
        notification, setNotification,
        handleFetchTree, handleFileSelect, handleSave,
    };
};