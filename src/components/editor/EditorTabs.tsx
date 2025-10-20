import { X } from 'lucide-react';
import { ActiveFile } from '../../types/editor';

interface EditorTabsProps {
    openFiles: ActiveFile[];
    activeFilePath: string | null;
    onTabClick: (path: string) => void;
    onTabClose: (path: string) => void;
}

export const EditorTabs = ({ openFiles, activeFilePath, onTabClick, onTabClose }: EditorTabsProps) => {
    if (openFiles.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-200 flex items-center overflow-x-auto">
            {openFiles.map(file => {
                const isActive = file.path === activeFilePath;
                const isModified = file.content !== file.originalContent;

                return (
                    <div
                        key={file.path}
                        className={`flex items-center justify-between text-sm pl-3 pr-1 py-1.5 border-r border-gray-300 cursor-pointer whitespace-nowrap ${isActive ? 'bg-white font-semibold' : 'bg-gray-100 hover:bg-gray-50'}`}
                    >
                        <button onClick={() => onTabClick(file.path)} className="flex items-center">
                            <span className="truncate max-w-xs">{file.path.split('/').pop()}</span>
                            {isModified && <span className="ml-2 text-blue-600">●</span>}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(file.path);
                            }}
                            className="ml-2 p-1 rounded hover:bg-gray-300"
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