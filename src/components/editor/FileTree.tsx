import { useState, useRef, useEffect } from 'react';
import { File, Folder, ChevronRight, ChevronDown, MoreVertical, FilePlus, FolderPlus, Edit3, Trash } from 'lucide-react';

const ActionMenu = ({ isVisible, onRename, onDelete }) => {
    if (!isVisible) return null;
    return (
        <div className="absolute right-2 top-6 z-10 w-40 bg-white border border-gray-300 rounded-md shadow-lg">
            <ul className="py-1 text-sm">
                <li><button onClick={onRename} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"><Edit3 size={14} /> Rename</button></li>
                <li><button onClick={onDelete} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"><Trash size={14} /> Delete</button></li>
            </ul>
        </div>
    );
};

const TreeNode = ({ name, node, onFileSelect, path = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const currentPath = path ? `${path}/${name}` : name;
    
    const isLeaf = node.__isLeaf;

    const handleMenuToggle = (e) => {
        e.stopPropagation();
        setIsMenuOpen(prev => !prev);
    };

    const handleAction = (action) => (e) => {
        e.stopPropagation();
        console.log(`${action} on ${currentPath}`);
        // Di sini nanti kita panggil fungsi dari props, contoh: onRename(currentPath)
        setIsMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);


    return (
        <li className="group relative">
            <div className="w-full flex items-center justify-between pr-2 text-sm hover:bg-purple-100">
                <button
                    onClick={() => isLeaf ? onFileSelect(node.__itemData.path) : setIsOpen(!isOpen)}
                    className="flex-grow flex items-center gap-2 pl-4 py-1.5 truncate"
                >
                    {!isLeaf && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    {isLeaf ? (
                         <File size={14} className="flex-shrink-0 text-gray-500 ml-5" />
                    ) : (
                         <Folder size={14} className="flex-shrink-0 text-yellow-600" />
                    )}
                    <span className="truncate">{name}</span>
                </button>
                <div ref={menuRef}>
                    <button onClick={handleMenuToggle} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300">
                         <MoreVertical size={14} />
                    </button>
                    <ActionMenu
                        isVisible={isMenuOpen}
                        onRename={handleAction('Rename')}
                        onDelete={handleAction('Delete')}
                    />
                </div>
            </div>

            {!isLeaf && isOpen && (
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