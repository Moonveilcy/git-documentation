import { useState, Fragment } from 'react';
import { useEditor } from '../hooks/useEditor';
import { FileTree } from '../components/editor/FileTree';
import { Editor } from '../components/editor/Editor';
import { EditorTabs } from '../components/editor/EditorTabs';
import { Toast } from '../components/commit/Toast';
import { UnapologeticButton } from '../components/commit/Shared';
import { Menu, X, Home, GitCommit, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Transition } from '@headlessui/react';

const Sidebar = ({ editor }) => (
    <div className="flex flex-col w-full h-full bg-white">
        <div className="p-4 space-y-4 border-b flex-shrink-0">
            <h3 className="font-bold text-lg">Configuration</h3>
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
        
        {editor.stagedFiles.size > 0 && (
            <div className="p-4 border-t flex-shrink-0 bg-gray-50">
                <h3 className="font-bold mb-2">Ready to Commit ({editor.stagedFiles.size})</h3>
                 <UnapologeticButton onClick={editor.handleCommit} disabled={editor.isCommitting} variant="primary">
                    <div className="flex items-center justify-center gap-2">
                        <GitCommit size={16} />
                        {editor.isCommitting ? 'Committing...' : 'Commit Changes'}
                    </div>
                </UnapologeticButton>
            </div>
        )}
    </div>
);

export default function EditorPage() {
    const editor = useEditor();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const activeFile = editor.activeFile;
    const isModified = activeFile ? activeFile.content !== activeFile.originalContent : false;

    return (
        <div className="h-screen w-screen bg-gray-800 flex overflow-hidden">
            {editor.notification && (
                <Toast 
                    message={editor.notification.message} 
                    type={editor.notification.type} 
                    onDismiss={() => editor.setNotification(null)} 
                />
            )}
            
            {/* Sidebar for Mobile */}
            <Transition show={sidebarOpen} as={Fragment}>
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <Transition.Child as={Fragment} enter="transition-opacity ease-linear duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity ease-linear duration-300" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    </Transition.Child>
                    <Transition.Child as="div" className="relative flex-1 flex flex-col max-w-xs w-full bg-white" enter="transition ease-in-out duration-300 transform" enterFrom="-translate-x-full" enterTo="translate-x-0" leave="transition ease-in-out duration-300 transform" leaveFrom="translate-x-0" leaveTo="-translate-x-full">
                        <button onClick={() => setSidebarOpen(false)} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800"><X size={24} /></button>
                        <Sidebar editor={editor} />
                    </Transition.Child>
                </div>
            </Transition>
            
            {/* Sidebar for Desktop */}
            <aside className="hidden md:block md:w-80 lg:w-96 flex-shrink-0 h-full">
                 <Sidebar editor={editor} />
            </aside>
            
            <div className="flex-grow flex flex-col min-w-0">
                <header className="bg-gray-900 flex items-center justify-between p-2 flex-shrink-0 text-white">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded hover:bg-gray-700 md:hidden">
                        <Menu size={20} />
                    </button>
                    <div className="flex-grow text-center text-sm font-semibold truncate px-2">
                        {editor.repo ? editor.repo : "GitMoon Code Editor"}
                    </div>
                    {activeFile && (
                        <UnapologeticButton onClick={editor.handleSave} disabled={!isModified} variant="primary" className="w-auto">
                            <div className="flex items-center justify-center gap-2 px-2">
                                <Save size={16} />
                                <span>Save</span>
                            </div>
                        </UnapologeticButton>
                    )}
                     <Link to="/" className="p-2 rounded hover:bg-gray-700 ml-2" aria-label="Go Home">
                        <Home size={20} />
                    </Link>
                </header>

                <main className="flex-grow flex flex-col min-h-0">
                    <EditorTabs
                        openFiles={editor.openFiles}
                        activeFilePath={editor.activeFile?.path || null}
                        stagedFiles={editor.stagedFiles}
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
                </main>
            </div>
        </div>
    );
}