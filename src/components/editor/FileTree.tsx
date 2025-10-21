import { useState, useRef, useEffect } from 'react';
import { File, Folder, ChevronRight, ChevronDown, MoreVertical, FilePlus, FolderPlus, Edit3, Trash2 } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

const ActionMenu = ({ isVisible, isFolder, actions }) => {
    if (!isVisible) return null;
    return (
        <div className="absolute right-2 top-8 z-20 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
            <ul className="py-1 text-sm text-gray-700">
                {isFolder && (
                    <>
                        <li><button onClick={actions.onNewFile} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><FilePlus size={14} /> New File</button></li>
                        <li><button onClick={actions.onNewFolder} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><FolderPlus size={14} /> New Folder</button></li>
                    </>
                )}
                <li><button onClick={actions.onRename} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><Edit3 size={14} /> Rename</button></li>
                <li><button onClick={actions.onDelete} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"><Trash2 size={14} /> Delete</button></li>
            </ul>
        </div>
    );
};

const TreeNode = ({ name, node, editor, path = '' }: { name: string, node: any, editor: ReturnType<typeof useEditor>, path?: string }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const isRoot = path === '';
    const currentPath = isRoot ? name : (path ? `${path}/${name}` : name);
    const isLeaf = node.__isLeaf;
    const isOpen = editor.expandedFolders.has(currentPath);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !(menuRef.current as any).contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    const handleAction = (actionType: 'newFile' | 'newFolder' | 'rename' | 'delete') => (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        const targetPath = isLeaf ? path : currentPath; 
        switch(actionType) {
            case 'newFile': editor.handleCreateNode(targetPath, 'file'); break;
            case 'newFolder': editor.handleCreateNode(targetPath, 'folder'); break;
            case 'rename': editor.handleRenameNode(currentPath); break;
            case 'delete': editor.handleDeleteNode(currentPath); break;
        }
    };

    return (
        <li className="group relative">
            <div className={`w-full flex items-center justify-between pr-2 text-sm hover:bg-purple-100 ${isRoot ? 'font-bold' : ''}`}>
                <button
                    onClick={() => isLeaf ? editor.handleFileSelect(node.__itemData.path) : editor.toggleFolder(currentPath)}
                    className="flex-grow flex items-center gap-2 pl-4 py-1.5 truncate text-left"
                >
                    {!isLeaf && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    {isLeaf ? <File size={14} className="flex-shrink-0 text-gray-500" style={{ marginLeft: isRoot ? '0' : '1.25rem' }} /> : <Folder size={14} className="flex-shrink-0 text-yellow-600" />}
                    <span>{name}</span>
                </button>
                <div ref={menuRef}>
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(p => !p); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300">
                        <MoreVertical size={16} />
                    </button>
                     <ActionMenu 
                        isVisible={isMenuOpen} 
                        isFolder={!isLeaf || isRoot}
                        actions={{
                            onNewFile: handleAction('newFile'),
                            onNewFolder: handleAction('newFolder'),
                            onRename: handleAction('rename'),
                            onDelete: handleAction('delete'),
                        }}
                    />
                </div>
            </div>
            {!isLeaf && isOpen && (
                <ul className="pl-4 border-l border-gray-200">
                    {Object.keys(node).sort((a, b) => {
                        const aIsLeaf = node[a].__isLeaf;
                        const bIsLeaf = node[b].__isLeaf;
                        if (aIsLeaf && !bIsLeaf) return 1;
                        if (!aIsLeaf && bIsLeaf) return -1;
                        return a.localeCompare(b);
                    }).map(childName => {
                        if (childName.startsWith('__')) return null;
                        return <TreeNode key={childName} name={childName} node={node[childName]} editor={editor} path={currentPath} />
                    })}
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