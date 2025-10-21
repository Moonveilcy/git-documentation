import { useState } from 'react';
import { File, Folder, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

const TreeNode = ({ name, node, onFileSelect, path = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentPath = path ? `${path}/${name}` : name;

    if (node.__isLeaf) {
        return (
            <li className="group">
                <button
                    onClick={() => onFileSelect(node.__itemData.path)}
                    className="w-full text-left flex items-center justify-between gap-2 pl-4 pr-2 py-1.5 text-sm hover:bg-purple-100"
                >
                    <div className="flex items-center gap-2 truncate">
                        <File size={14} className="flex-shrink-0 text-gray-500" />
                        <span className="truncate">{name}</span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300">
                         <MoreVertical size={14} />
                    </button>
                </button>
            </li>
        );
    }

    return (
        <li className="group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left flex items-center justify-between gap-2 pl-4 pr-2 py-1.5 text-sm hover:bg-purple-100 font-semibold"
            >
                 <div className="flex items-center gap-2 truncate">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={14} className="flex-shrink-0 text-yellow-600" />
                    <span>{name}</span>
                </div>
                 <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300">
                    <MoreVertical size={14} />
                </button>
            </button>
            {isOpen && (
                <ul className="pl-4 border-l border-gray-200">
                    {Object.entries(node).map(([childName, childNode]) => (
                        <TreeNode key={childName} name={childName} node={childNode} onFileSelect={onFileSelect} path={currentPath} />
                    ))}
                </ul>
            )}
        </li>
    );
};

interface FileTreeProps {
    tree: object;
    onFileSelect: (path: string) => void;
    isLoading: boolean;
}

export const FileTree = ({ tree, onFileSelect, isLoading }: FileTreeProps) => {
    if (isLoading) {
        return <div className="p-4 text-gray-500 text-sm">Loading tree...</div>;
    }

    const hasFiles = Object.keys(tree).length > 0;

    return (
        <>
            {hasFiles ? (
                <ul>
                    {Object.entries(tree).map(([name, node]) => (
                        <TreeNode key={name} name={name} node={node} onFileSelect={onFileSelect} />
                    ))}
                </ul>
            ) : (
                <p className="p-4 text-sm text-gray-500">Clone a repository to see files.</p>
            )}
        </>
    );
};