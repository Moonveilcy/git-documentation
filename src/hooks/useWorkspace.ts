import { useState, useCallback, useEffect } from 'react';
import * as editorApi from '../lib/editor/api';
import { NotificationType } from './useGithub';
import { Workspace } from '../types/editor';

export const useWorkspace = () => {
    const [token, setToken] = useState('');
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('git');

    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);

    const handleCloneRepo = useCallback(async (repoPath: string, branchName: string) => {
        setIsLoading(true);
        setNotification(null);
        setWorkspace(null);

        try {
            const data = await editorApi.scanRepoTree(repoPath, branchName, token);
            if (!data || !data.tree) throw new Error("Repo not found or is empty.");
            
            const [owner, repo] = repoPath.split('/');
            const newWorkspace: Workspace = { owner, repo, branch: branchName, isCloned: true, tree: data.tree };
            setWorkspace(newWorkspace);
            setSidebarMode('files');
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
            setWorkspace(null);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    return {
        token,
        setToken,
        workspace,
        setWorkspace,
        isLoading,
        setIsLoading,
        notification,
        setNotification,
        sidebarMode,
        setSidebarMode,
        handleCloneRepo,
    };
};