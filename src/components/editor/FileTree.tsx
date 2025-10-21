import { useState, useRef, useEffect, Fragment } from 'react';
import { File, Folder, ChevronRight, ChevronDown, MoreVertical, FilePlus, FolderPlus, Edit3, Trash } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

const ActionMenu = ({ isVisible, isFolder, actions }) => {
    if (!isVisible) return null;
    return (
        <div className="absolute right-2 top-8 z-20 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
            <ul className="py-1 text-sm text-gray-700">
                {isFolder && <>
                    <li><button onClick={actions.onNewFile} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><FilePlus size={14} /> New File</button></li>
                    <li><button onClick={actions.onNewFolder} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><FolderPlus size={14} /> New Folder</button></li>
                </>}
                <li><button onClick={actions.onRename} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><Edit3 size={14} /> Rename</button></li>
                <li><button onClick={actions.onDelete} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"><Trash size={14} /> Delete</button></li>
            </ul>
        </div>
    );
};

const TreeNode = ({ name, node, path = '', editor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const isRoot = path === '';
    const currentPath = isRoot ? name : (path ? `${path}/${name}` : name);
    
    const isLeaf = node.__isLeaf;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleAction = (action, type = null) => (e) => {
        e.stopPropagation();
        const targetPath = isRoot ? '' : (isLeaf ? path : currentPath);
        if (action === 'new') editor.handleCreateNode(targetPath, type);
        else if (action === 'rename') editor.handleRenameNode(currentPath);
        else if (action === 'delete') editor.handleDeleteNode(currentPath);
        if (!isLeaf) setIsOpen(true);
        setIsMenuOpen(false);
    };

    return (
        <li className="group relative">
            <div className={`w-full flex items-center justify-between pr-2 text-sm hover:bg-purple-100 ${isRoot ? 'font-bold' : ''}`}>
                <button
                    onClick={() => isLeaf ? editor.handleFileSelect(node.__itemData.path) : setIsOpen(!isOpen)}
                    className="flex-grow flex items-center gap-2 pl-4 py-1.5 truncate"
                >
                    {!isLeaf && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    {isLeaf ? <File size={14} className="flex-shrink-0 text-gray-500 ml-5" /> : <Folder size={14} className="flex-shrink-0 text-yellow-600" />}
                    <span>{name}</span>
                </button>
                <div ref={menuRef}>
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(p => !p); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300">
                         <MoreVertical size={16} />
                    </button>
                    <ActionMenu
                        isVisible={isMenuOpen} isFolder={!isLeaf}
                        actions={{
                            onNewFile: handleAction('new', 'file'),
                            onNewFolder: handleAction('new', 'folder'),
                            onRename: handleAction('rename'),
                            onDelete: handleAction('delete'),
                        }}
                    />
                </div>
            </div>

            {!isLeaf && isOpen && (
                <ul className="pl-4 border-l border-gray-200">
                    {Object.entries(node).sort(([a], [b]) => a.localeCompare(b)).map(([childName, childNode]) => (
                        <Fragment key={childName}>
                            {!childNode.__isLeaf && <TreeNode name={childName} node={childNode} editor={editor} path={currentPath} />}
                        </Fragment>
                    ))}
                    {Object.entries(node).sort(([a], [b]) => a.localeCompare(b)).map(([childName, childNode]) => (
                        <Fragment key={childName}>
                            {childNode.__isLeaf && <TreeNode name={childName} node={childNode} editor={editor} path={currentPath} />}
                        </Fragment>
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
    if (editor.isLoading) return <div className="p-4 text-gray-500 text-sm">Loading tree...</div>;
    const hasFiles = Object.keys(editor.structuredTree).length > 0;
    return (
        <div className="h-full overflow-y-auto">
            {hasFiles ? (
                <ul>
                    {Object.entries(editor.structuredTree).map(([name, node]) => (
                        <TreeNode key={name} name={name} node={node} editor={editor} />
                    ))}
                </ul>
            ) : (
                <p className="p-4 text-sm text-gray-500">Clone a repository to see files.</p>
            )}
        </div>
    );
};