import { useState, Fragment } from 'react';
import { useEditor } from '../hooks/useEditor';
import { FileTree } from '../components/editor/FileTree';
import { Editor } from '../components/editor/Editor';
import { EditorTabs } from '../components/editor/EditorTabs';
import { Toast } from '../components/commit/Toast';
import { UnapologeticButton } from '../components/commit/Shared';
import { Menu, X, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Transition } from '@headlessui/react';

const Sidebar = ({ editor, isOpen, onClose }) => (
    <Transition show={isOpen} as={Fragment}>
        <div className="fixed inset-0 z-40 flex">
            <Transition.Child
                as={Fragment}
                enter="transition-opacity ease-linear duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            </Transition.Child>

            <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
            >
                <div className="relative flex flex-col w-full max-w-xs bg-white h-full shadow-xl">
                    <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                        <h2 className="text-lg font-bold">GitMoon Editor</h2>
                        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200"><X size={20} /></button>
                    </div>
                    
                    <div className="p-4 space-y-4 border-b flex-shrink-0">
                        <h3 className="font-bold">Configuration</h3>
                        <input type="password" placeholder="GitHub Token" value={editor.token} onChange={(e) => editor.setToken(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                        <input type="text" placeholder="Repository (username/repo)" value={editor.repo} onChange={(e) => editor.setRepo(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                        <input type="text" placeholder="Branch" value={editor.branch} onChange={(e) => editor.setBranch(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                        <UnapologeticButton onClick={editor.handleFetchTree} disabled={editor.isLoadingTree} variant="secondary">
                            {editor.isLoadingTree ? 'Scanning...' : 'Scan Repository'}
                        </UnapologeticButton>
                    </div>

                    <div className="flex-grow overflow-y-auto min-h-0">
                        <h3 className="p-4 font-bold sticky top-0 bg-white z-10">File Explorer</h3>
                        <FileTree tree={editor.structuredTree} onFileSelect={editor.handleFileSelect} isLoading={editor.isLoadingTree} />
                    </div>
                </div>
            </Transition.Child>
        </div>
    </Transition>
);

export default function EditorPage() {
    const editor = useEditor();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const activeFile = editor.activeFile;
    const isModified = activeFile ? activeFile.content !== activeFile.originalContent : false;

    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden">
            {editor.notification && (
                <Toast 
                    message={editor.notification.message} 
                    type={editor.notification.type} 
                    onDismiss={() => editor.setNotification(null)} 
                />
            )}
            
            <Sidebar editor={editor} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <header className="bg-white border-b border-gray-200 flex items-center justify-between p-2 flex-shrink-0">
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded hover:bg-gray-200">
                    <Menu size={20} />
                </button>
                <div className="flex-grow text-center text-sm font-semibold">
                    {editor.repo ? editor.repo : "GitMoon Code Editor"}
                </div>
                <Link to="/" className="p-2 rounded hover:bg-gray-200" aria-label="Go Home">
                    <Home size={20} />
                </Link>
            </header>

            <main className="flex-grow flex flex-col min-h-0">
                <EditorTabs
                    openFiles={editor.openFiles}
                    activeFilePath={editor.activeFile?.path || null}
                    onTabClick={editor.setActiveFilePath}
                    onTabClose={editor.handleCloseFile}
                />
                <div className="flex-grow relative">
                    {activeFile ? (
                        <Editor 
                            activeFile={activeFile}
                            editedContent={activeFile.content}
                            onContentChange={(newContent) => editor.handleContentChange(activeFile.path, newContent)}
                            isLoading={false}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-800 text-white p-4 text-center">
                            Select a file from the sidebar to start editing.
                        </div>
                    )}
                </div>
                {activeFile && (
                    <footer className="bg-white border-t p-2 flex justify-end">
                        <UnapologeticButton
                            onClick={editor.handleSave}
                            disabled={editor.isSaving || !isModified}
                            variant="primary"
                            className="w-auto"
                        >
                           {editor.isSaving ? 'Saving...' : 'Save & Commit'}
                        </UnapologeticButton>
                    </footer>
                )}
            </main>
        </div>
    );
}