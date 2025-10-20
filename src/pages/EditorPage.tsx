import { useEditor } from '../hooks/useEditor';
import { ConfigSection } from '../components/commit/ConfigSection'; 
import { FileTree } from '../components/editor/FileTree';
import { Editor } from '../components/editor/Editor';
import { Toast } from '../components/commit/Toast';
import { UnapologeticButton } from '../components/commit/Shared';

export default function EditorPage() {
    const editor = useEditor();

    return (
        <>
            {editor.notification && (
                <Toast 
                    message={editor.notification.message} 
                    type={editor.notification.type} 
                    onDismiss={() => editor.setNotification(null)} 
                />
            )}
            <div className="flex flex-col h-screen bg-white text-gray-800">
                <div className="p-4 border-b">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-2xl font-bold">Code Editor</h1>
                        <p className="text-sm text-gray-500">Browse, edit, and commit files directly from your browser.</p>
                        <div className="mt-4 p-4 bg-yellow-100 rounded-lg border-2 border-black">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <input type="password" placeholder="GitHub Token" value={editor.token} onChange={(e) => editor.setToken(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                               <input type="text" placeholder="Repository (username/repo)" value={editor.repo} onChange={(e) => editor.setRepo(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                               <input type="text" placeholder="Branch (main)" value={editor.branch} onChange={(e) => editor.setBranch(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                            </div>
                             <UnapologeticButton
                                onClick={editor.handleFetchTree}
                                disabled={editor.isLoadingTree}
                                variant="secondary"
                                className="mt-4"
                            >
                                {editor.isLoadingTree ? 'Scanning...' : 'Scan Repository'}
                            </UnapologeticButton>
                        </div>
                    </div>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    <aside className="w-1/4 h-full">
                        <FileTree tree={editor.tree} onFileSelect={editor.handleFileSelect} isLoading={editor.isLoadingTree} />
                    </aside>
                    <main className="w-3/4 flex flex-col h-full">
                        <div className="flex-grow">
                             {editor.activeFile ? (
                                <Editor 
                                    activeFile={editor.activeFile}
                                    editedContent={editor.editedContent}
                                    onContentChange={editor.setEditedContent}
                                    isLoading={editor.isLoadingFile}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-gray-800 text-white">Select a file to start editing</div>
                            )}
                        </div>
                        {editor.activeFile && (
                            <div className="p-3 border-t bg-gray-100">
                                <UnapologeticButton
                                    onClick={editor.handleSave}
                                    disabled={editor.isSaving || editor.editedContent === editor.activeFile.content}
                                    variant="primary"
                                >
                                    {editor.isSaving ? 'Saving...' : 'Save & Commit Changes'}
                                </UnapologeticButton>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}