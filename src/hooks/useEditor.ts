import { useState, useCallback, useEffect } from 'react';
import * as editorApi from '../lib/editor/api';
import { NotificationType } from './useGithub';
import { RepoTreeItem, ActiveFile, Workspace, SidebarMode } from '../types/editor';
import { createNodeInTree, deleteNodeFromTree, renameNodeInTree } from '../lib/editor/fileSystemUtils';

// Fungsi buildFileTree tetap di sini karena spesifik untuk hook ini
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
    const [modifiedFiles, setModifiedFiles] = useState<Record<string, string | null>>({});

    // -- EFEK & FUNGSI STANDAR --
    useEffect(() => {
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken) setToken(storedToken);
    }, []);
    
    // EFEK PENTING: Me-refresh tampilan tree setiap kali daftar file di workspace berubah
    useEffect(() => {
        if (workspace) {
            const tree = buildFileTree(workspace.tree, workspace.repo);
            setStructuredTree(tree);
        }
    }, [workspace?.tree, workspace?.repo]);

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };
    
    // -- FUNGSI UTAMA (CLONE, OPEN, SAVE, COMMIT) --
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
            let content = '';
            let originalContent = '';

            if (modifiedContent !== undefined && modifiedContent !== null) {
                content = modifiedContent;
                 // Ambil konten asli untuk perbandingan
                const originalFile = workspace.tree.find(f => f.path === path);
                if (originalFile) {
                    originalContent = await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
                } else {
                    originalContent = content; // File baru
                }
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
            setNotification({ message: `${activeFilePath.split('/').pop()} saved locally.`, type: 'success' });
        }
    };

    const handleCommit = useCallback(async (commitMessage: string) => {
        if (!workspace || stagedFiles.size === 0) return;
        setIsLoading(true);
        try {
            const filesToCommit = Array.from(stagedFiles).map(path => ({ path, content: modifiedFiles[path] }));
            await editorApi.commitFiles(`${workspace.owner}/${workspace.repo}`, workspace.branch, token, filesToCommit, commitMessage);
            
            setStagedFiles(new Set());
            // Setelah commit, kita clone ulang untuk mendapatkan state terbaru dari repo
            await handleCloneRepo(`${workspace.owner}/${workspace.repo}`, workspace.branch);
            setNotification({ message: 'Changes committed successfully!', type: 'success' });
        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [workspace, token, stagedFiles, modifiedFiles, handleCloneRepo]);

    // -- FUNGSI FILE SYSTEM (MENGGUNAKAN UTILS) --
    const handleCreateNode = (basePath: string, type: 'file' | 'folder') => {
        const name = prompt(`Enter new ${type} name:`);
        if (!name || !workspace) return;

        const path = basePath === workspace.repo ? name : `${basePath}/${name}`;
        
        setWorkspace(ws => ws ? createNodeInTree(ws, path, type) : null);
        
        const finalPath = type === 'folder' ? `${path}/.gitkeep` : path;
        setModifiedFiles(prev => ({...prev, [finalPath]: ''}));
        setStagedFiles(prev => new Set(prev).add(finalPath));
        
        if(type === 'file') handleFileSelect(path);
        setNotification({ message: `New ${type} created locally.`, type: 'info' });
    };

    const handleRenameNode = (oldPath: string) => {
        const oldName = oldPath.split('/').pop() || '';
        const newName = prompt(`Enter new name for ${oldName}:`, oldName);
        if (!newName || !workspace) return;
    
        const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
        
        // Dapatkan konten saat ini
        const content = modifiedFiles[oldPath] ?? openFiles.find(f => f.path === oldPath)?.content;
        if (content === undefined) {
            setNotification({ message: "Open the file before renaming.", type: 'error' });
            return;
        }

        // Hapus state lama, tambahkan state baru
        setWorkspace(ws => ws ? renameNodeInTree(ws, oldPath, newPath) : null);
        setModifiedFiles(prev => {
            const next = {...prev};
            delete next[oldPath];
            next[newPath] = content;
            next[oldPath] = null; // Tandai path lama untuk dihapus saat commit
            return next;
        });
        setStagedFiles(prev => new Set(prev).add(oldPath).add(newPath));

        // Update tab yang terbuka
        setOpenFiles(files => files.map(f => f.path === oldPath ? { ...f, path: newPath } : f));
        if (activeFilePath === oldPath) setActiveFilePath(newPath);

        setNotification({ message: `Renamed to ${newName} locally.`, type: 'info' });
    };

    const handleDeleteNode = (path: string) => {
        if (!confirm(`Are you sure you want to delete ${path}?`)) return;
        if (!workspace) return;
        
        setWorkspace(deleteNodeFromTree(workspace, path));
        setModifiedFiles(prev => ({ ...prev, [path]: null })); // Tandai untuk dihapus
        setStagedFiles(prev => new Set(prev).add(path));
        
        handleCloseFile(path);
        setNotification({ message: `${path} deleted locally.`, type: 'info' });
    };

    const handleDownloadFile = async (path: string) => {
        if (!workspace) return;
        try {
            const content = modifiedFiles[path] ?? openFiles.find(f => f.path === path)?.content ?? await editorApi.getFileContent(`${workspace.owner}/${workspace.repo}`, path, workspace.branch, token);
            if(content === null) {
                setNotification({ message: `File is marked for deletion. Cannot download.`, type: 'error' });
                return;
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

    return {
        token, setToken, workspace, structuredTree, openFiles, activeFile: openFiles.find(f => f.path === activeFilePath), stagedFiles, sidebarMode, setSidebarMode,
        isLoading, isOpeningFile, notification, setNotification, expandedFolders,
        handleCloneRepo, handleFileSelect, handleContentChange, handleCloseFile, handleSave, handleCommit, setActiveFilePath, toggleFolder,
        handleCreateNode, handleRenameNode, handleDeleteNode, handleDownloadFile
    };
};