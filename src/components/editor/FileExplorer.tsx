import { MoreVertical, FolderPlus, FilePlus, Edit, Trash2 } from 'lucide-react';
import { FileTree } from './FileTree';
import { useEditor } from '../../hooks/useEditor';

interface FileExplorerProps {
    editor: ReturnType<typeof useEditor>;
}

export const FileExplorer = ({ editor }: FileExplorerProps) => {
    if (!editor.workspace) {
        return (
            <div className="p-4 text-sm text-gray-500">
                <p>No repository loaded.</p>
                <p>Go to the Git tab to clone a repository.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b flex-shrink-0">
                <h3 className="font-bold text-sm uppercase tracking-wider">File Explorer</h3>
            </div>
            <div className="flex-grow overflow-y-auto">
                <FileTree
                    tree={editor.structuredTree}
                    onFileSelect={editor.handleFileSelect}
                    isLoading={editor.isLoading}
                />
            </div>
            <div className="p-2 border-t text-xs text-gray-500 flex-shrink-0">
                {editor.workspace.repo} @ {editor.workspace.branch}
            </div>
        </div>
    );
};