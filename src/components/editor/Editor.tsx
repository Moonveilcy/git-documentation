import { useRef, useEffect, useState } from 'react';
import { editor as MonacoEditor, IDisposable } from 'monaco-editor';
import { ActiveFile } from '../../types/editor';

const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js': case 'jsx': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'json': return 'json';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'md': return 'markdown';
        case 'py': return 'python';
        case 'java': return 'java';
        case 'go': return 'go';
        case 'php': return 'php';
        case 'rb': return 'ruby';
        default: return 'plaintext';
    }
};

interface EditorProps {
    activeFile: ActiveFile | undefined;
    onContentChange: (path: string, content: string) => void;
    isOpeningFile: string | null;
}

export const Editor = ({ activeFile, onContentChange, isOpeningFile }: EditorProps) => {
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const subscriptionRef = useRef<IDisposable | null>(null);
    
    const onContentChangeRef = useRef(onContentChange);
    onContentChangeRef.current = onContentChange;

    const activeFileRef = useRef(activeFile);
    activeFileRef.current = activeFile;

    useEffect(() => {
        let isDisposed = false;
        const monaco = (window as any).monaco;

        const initializeMonaco = (monacoInstance: any) => {
            if (containerRef.current && !editorRef.current) {
                editorRef.current = monacoInstance.editor.create(containerRef.current, {
                    value: '',
                    language: 'plaintext',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                });
                setIsEditorReady(true);
            }
        };
        
        if (containerRef.current) {
            if (!monaco) {
                if (document.getElementById('monaco-loader-script')) return;
                const script = document.createElement('script');
                script.id = 'monaco-loader-script';
                script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js';
                document.body.appendChild(script);
                script.onload = () => {
                    if (isDisposed) return;
                    const require = (window as any).require;
                    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
                    require(['vs/editor/editor.main'], (monacoInstance: any) => {
                        (window as any).monaco = monacoInstance;
                        if (!isDisposed) initializeMonaco(monacoInstance);
                    });
                };
            } else {
                initializeMonaco(monaco);
            }
        }

        return () => {
            isDisposed = true;
            subscriptionRef.current?.dispose();
            editorRef.current?.dispose();
            (window as any).monaco?.editor.getModels().forEach((model: any) => model.dispose());
            editorRef.current = null;
        };
    }, []);

    useEffect(() => {
        const monaco = (window as any).monaco;
        if (!isEditorReady || !editorRef.current || !monaco) return;

        subscriptionRef.current?.dispose();

        if (activeFile) {
            const modelUri = monaco.Uri.file(activeFile.path);
            let model = monaco.editor.getModel(modelUri);

            if (!model) {
                const language = getLanguageFromPath(activeFile.path);
                model = monaco.editor.createModel(activeFile.content, language, modelUri);
            }
            
            if (model.getValue() !== activeFile.content) {
                 model.pushEditOperations([], [{
                    range: model.getFullModelRange(),
                    text: activeFile.content
                 }], () => null);
            }

            if (editorRef.current.getModel() !== model) {
                editorRef.current.setModel(model);
            }

            subscriptionRef.current = editorRef.current.onDidChangeModelContent(() => {
                const currentValue = editorRef.current?.getModel()?.getValue();
                const currentFile = activeFileRef.current;
                if (currentFile && currentValue !== undefined && currentValue !== currentFile.content) {
                    onContentChangeRef.current(currentFile.path, currentValue);
                }
            });
        } else {
            editorRef.current.setModel(null);
        }

    }, [activeFile, isEditorReady]);

    const showOverlay = isOpeningFile || !activeFile;

    return (
        <div className="h-full w-full relative bg-[#1e1e1e]">
            {showOverlay && (
                 <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-[#1e1e1e]">
                    <span className="text-gray-400 text-lg animate-pulse">
                        {isOpeningFile ? `Opening ${isOpeningFile.split('/').pop()}...` : 'Select a file or clone a repository'}
                    </span>
                </div>
            )}
            <div
                ref={containerRef}
                className={`h-full w-full ${showOverlay ? 'opacity-0' : 'opacity-100'}`}
            />
        </div>
    );
};