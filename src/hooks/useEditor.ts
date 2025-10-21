import { useWorkspace } from './useWorkspace';
import { useFileManagement } from './useFileManagement';
import { useFileSystem } from './useFileSystem';
import { useCallback } from 'react';
import * as editorApi from '../lib/editor/api';

export const useEditor = () => {
    // 1. Hook fundamental untuk workspace
    const workspaceManager = useWorkspace();

    // 2. Hook untuk file yang terbuka di editor, bergantung pada workspace
    const fileManager = useFileManagement({
        workspace: workspaceManager.workspace,
        token: workspaceManager.token,
        setNotification: workspaceManager.setNotification,
    });

    // 3. Hook untuk file tree di sidebar, bergantung dan bisa mengubah workspace
    const fileSystemManager = useFileSystem({
        workspace: workspaceManager.workspace,
        setWorkspace: workspaceManager.setWorkspace,
        setNotification: workspaceManager.setNotification,
        setModifiedFiles: fileManager.setModifiedFiles,
        setStagedFiles: fileManager.setStagedFiles,
        handleFileSelect: fileManager.handleFileSelect,
        handleCloseFile: fileManager.handleCloseFile,
    });

    // 4. Logika untuk commit, yang membutuhkan data dari semua hook lain
    const handleCommit = useCallback(async (commitMessage: string) => {
        const { workspace, token, setIsLoading, setNotification, handleCloneRepo } = workspaceManager;
        const { stagedFiles, modifiedFiles, setStagedFiles } = fileManager;

        if (!workspace || stagedFiles.size === 0) return;
        setIsLoading(true);
        try {
            const filesToCommit = Array.from(stagedFiles).map(path => ({
                path,
                content: modifiedFiles[path],
            }));
            await editorApi.commitFiles(
                `${workspace.owner}/${workspace.repo}`,
                workspace.branch,
                token,
                filesToCommit,
                commitMessage
            );
            
            setStagedFiles(new Set());
            setNotification({ message: 'Changes committed successfully!', type: 'success' });
            await handleCloneRepo(`${workspace.owner}/${workspace.repo}`, workspace.branch);
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspaceManager, fileManager]);

    return {
        ...workspaceManager,
        ...fileManager,
        ...fileSystemManager,
        activeFile: fileManager.openFiles.find(f => f.path === fileManager.activeFilePath),
        handleCommit,
    };
};