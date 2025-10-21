import { Folder, GitCommit, SidebarMode, useEditor } from '../../types/editor';
import { FileExplorer } from './FileExplorer';
import { SourceControl } from './SourceControl';

interface SidebarProps {
    editor: ReturnType<typeof useEditor>;
}

const TabButton = ({ icon: Icon, mode, activeMode, setMode }) => (
    <button
        onClick={() => setMode(mode)}
        className={`p-3 hover:bg-gray-200 ${activeMode === mode ? 'bg-gray-200 border-l-2 border-purple-600' : ''}`}
        aria-label={`${mode} view`}
    >
        <Icon size={24} className={activeMode === mode ? 'text-purple-600' : 'text-gray-600'} />
    </button>
);

export const Sidebar = ({ editor }: SidebarProps) => {
    return (
        <div className="flex h-full bg-white">
            <div className="w-16 bg-gray-100 border-r flex flex-col items-center pt-4 space-y-4">
                <TabButton icon={Folder} mode="files" activeMode={editor.sidebarMode} setMode={editor.setSidebarMode} />
                <TabButton icon={GitCommit} mode="git" activeMode={editor.sidebarMode} setMode={editor.setSidebarMode} />
            </div>
            <div className="flex-grow">
                {editor.sidebarMode === 'files' && <FileExplorer editor={editor} />}
                {editor.sidebarMode === 'git' && <SourceControl editor={editor} />}
            </div>
        </div>
    );
};