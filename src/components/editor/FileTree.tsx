import { useRef, useEffect, Fragment } from 'react';
import { File, Folder, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

const ActionMenu = () => null; 

const TreeNode = ({ name, node, editor, path = '' }: { name: string, node: any, editor: ReturnType<typeof useEditor>, path?: string }) => {
    const isRoot = path === '';
    const currentPath = isRoot ? name : (path ? `${path}/${name}` : name);
    const isLeaf = node.__isLeaf;
    const isOpen = editor.expandedFolders.has(currentPath);

    return (
        <li className="group relative">
            <div className={`w-full flex items-center justify-between pr-2 text-sm hover:bg-purple-100 ${isRoot ? 'font-bold' : ''}`}>
                <button
                    onClick={() => isLeaf ? editor.handleFileSelect(node.__itemData.path) : editor.toggleFolder(currentPath)}
                    className="flex-grow flex items-center gap-2 pl-4 py-1.5 truncate text-left"
                >
                    {!isLeaf && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    {isLeaf ? <File size={14} className="flex-shrink-0 text-gray-500 ml-5" /> : <Folder size={14} className="flex-shrink-0 text-yellow-600" />}
                    <span>{name}</span>
                </button>
            </div>
            {!isLeaf && isOpen && (
                <ul className="pl-4 border-l border-gray-200">
                    {Object.entries(node).filter(([_, childNode]) => !(childNode as any).__isLeaf).sort(([a], [b]) => a.localeCompare(b)).map(([childName, childNode]) => (
                        <TreeNode key={childName} name={childName} node={childNode} editor={editor} path={currentPath} />
                    ))}
                    {Object.entries(node).filter(([_, childNode]) => (childNode as any).__isLeaf).sort(([a], [b]) => a.localeCompare(b)).map(([childName, childNode]) => (
                        <TreeNode key={childName} name={childName} node={childNode} editor={editor} path={currentPath} />
                    ))}
                </ul>
            )}
        </li>
    );
};

interface FileTreeProps {
    editor: ReturnType<typeof useEditor>;
}

export const FileTree = ({ editor }: FileTreeProps) => {
    if (!editor || !editor.workspace) return null;
    
    const hasFiles = Object.keys(editor.structuredTree).length > 0;
    if (!hasFiles) {
         return <p className="p-4 text-sm text-gray-500">Repository is empty or still loading files.</p>
    }
    return (
        <div className="h-full overflow-y-auto">
            <ul>
                {Object.entries(editor.structuredTree).map(([name, node]) => (
                    <TreeNode key={name} name={name} node={node as object} editor={editor} />
                ))}
            </ul>
        </div>
    );
};