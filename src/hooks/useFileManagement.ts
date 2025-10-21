import { useState, useCallback } from 'react';
import * as editorApi from '../lib/editor/api';
import { ActiveFile, Workspace } from '../types/editor';
import { NotificationType } from './useGithub';

type UseFileManagementParams = {
    workspace: Workspace | null;
    token: string;
    setNotification: (notification: NotificationType | null) => void;
};

export const useFileManagement = ({ workspace, token, setNotification }: UseFileManagementParams) => {
    const [openFiles, setOpenFiles] = useState<ActiveFile[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [modifiedFiles, setModifiedFiles] = useState<Record<string, string | null>>({});
    const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
    const [isOpeningFile, setIsOpeningFile] = useState<string | null>(null);

    const handleFileSelect = useCallback(async (path: string) => {
        if (openFiles.some(f => f.path === path)) {
            setActiveFilePath(path);
            return;
        }
        if (!workspace) return;
        setIsOpeningFile(path);
        try {
            const modifiedContent = modifiedFiles[path];
            let content = '';
            let originalContent = '';

            if (modifiedContent !== undefined && modifiedContent !== null) {
                content = modifiedContent;
                const originalFile = workspace.tree.find(f => f.path === path);
                originalContent = originalFile ? await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token) : content;
            } else {
                content = await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token) ?? '';
                originalContent = content;
            }
            
            const newFile: ActiveFile = { path, content, originalContent };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (error) {
            setNotification({ message: `Failed to open ${path}: ${(error as Error).message}`, type: 'error' });
        } finally {
            setIsOpeningFile(null);
        }
    }, [workspace, token, openFiles, modifiedFiles, setNotification]);

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
            setNotification({ message: `${activeFilePath.split('/').pop()} saved locally.`, type: 'success' });
        }
    };

    return {
        openFiles,
        setOpenFiles,
        activeFilePath,
        setActiveFilePath,
        modifiedFiles,
        setModifiedFiles,
        stagedFiles,
        setStagedFiles,
        isOpeningFile,
        handleFileSelect,
        handleContentChange,
        handleCloseFile,
        handleSave,
    };
};