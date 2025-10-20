import { RepoTreeItem } from '../../types/editor';
import { File, Folder } from 'lucide-react';

interface FileTreeProps {
    tree: RepoTreeItem[];
    onFileSelect: (path: string, sha: string) => void;
    isLoading: boolean;
}

export const FileTree = ({ tree, onFileSelect, isLoading }: FileTreeProps) => {
    const filesOnly = tree.filter(item => item.type === 'blob');

    if (isLoading) {
        return <div className="p-4 text-gray-500">Loading tree...</div>;
    }

    return (
        <div className="bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
            <div className="p-3 font-bold border-b bg-gray-100">File Explorer</div>
            {filesOnly.length > 0 ? (
                <ul>
                    {filesOnly.map(item => (
                        <li key={item.path}>
                            <button
                                onClick={() => onFileSelect(item.path, item.sha)}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-purple-100"
                            >
                                <File size={14} className="flex-shrink-0" />
                                <span className="truncate">{item.path}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="p-4 text-sm text-gray-500">No files found. Scan a repository to begin.</p>
            )}
        </div>
    );
};