import { X } from 'lucide-react';
import { ActiveFile } from '../../types/editor';

interface EditorTabsProps {
    openFiles: ActiveFile[];
    activeFilePath: string | null;
    stagedFiles: Set<string>;
    onTabClick: (path: string) => void;
    onTabClose: (path: string) => void;
}

export const EditorTabs = ({ openFiles, activeFilePath, stagedFiles, onTabClick, onTabClose }: EditorTabsProps) => {
    if (openFiles.length === 0) return null;

    return (
        <div className="bg-gray-700 flex items-center overflow-x-auto shadow-inner">
            {openFiles.map(file => {
                const isActive = file.path === activeFilePath;
                const isModified = file.content !== file.originalContent;
                const isStaged = stagedFiles.has(file.path);

                let statusColor = '';
                if (isStaged) statusColor = 'text-green-400';
                else if (isModified) statusColor = 'text-yellow-400';

                return (
                    <div
                        key={file.path}
                        onClick={() => onTabClick(file.path)}
                        className={`flex items-center justify-between text-sm pl-3 pr-1 py-1.5 border-r border-gray-600 cursor-pointer whitespace-nowrap ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                        <div className="flex items-center">
                            <span className="truncate max-w-xs">{file.path.split('/').pop()}</span>
                            {(isModified || isStaged) && (
                                <span className={`ml-2 font-bold ${statusColor}`}>●</span>
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(file.path);
                            }}
                            className="ml-2 p-1 rounded hover:bg-gray-600"
                            aria-label={`Close ${file.path}`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};