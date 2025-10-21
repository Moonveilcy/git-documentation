import { useRef, useEffect, useState } from 'react';
import { editor as MonacoEditor, Uri } from 'monaco-editor';
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

                editorRef.current.onDidChangeModelContent(() => {
                    const currentFile = activeFileRef.current;
                    const model = editorRef.current?.getModel();
                    const currentValue = model?.getValue();

                    if (currentFile && model && currentValue !== currentFile.content) {
                        if (model.uri.path === `/${currentFile.path}`) {
                           onContentChangeRef.current(currentFile.path, currentValue || '');
                        }
                    }
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
                        if (!isDisposed) {
                           initializeMonaco(monacoInstance);
                        }
                    });
                };
            } else {
                initializeMonaco(monaco);
            }
        }

        return () => {
            isDisposed = true;
            editorRef.current?.dispose();
            (window as any).monaco?.editor.getModels().forEach((model: any) => model.dispose());
            editorRef.current = null;
        };
    }, []);

    useEffect(() => {
        const monaco = (window as any).monaco;
        if (!isEditorReady || !editorRef.current || !monaco) return;

        if (activeFile) {
            const modelUri = monaco.Uri.file(activeFile.path);
            let model = monaco.editor.getModel(modelUri);

            if (!model) {
                const language = getLanguageFromPath(activeFile.path);
                model = monaco.editor.createModel(activeFile.content, language, modelUri);
            } else {
                if (model.getValue() !== activeFile.content) {
                    model.setValue(activeFile.content);
                }
            }
            
            if (editorRef.current.getModel() !== model) {
                editorRef.current.setModel(model);
            }
        } else {
            editorRef.current.setModel(null);
        }

    }, [activeFile, isEditorReady]);

    return (
        <div className="h-full w-full relative bg-[#1e1e1e]">
            {(isOpeningFile || !activeFile) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-gray-400 text-lg animate-pulse">
                        {isOpeningFile ? `Opening ${isOpeningFile.split('/').pop()}...` : 'Select a file or clone a repository to start'}
                    </span>
                </div>
            )}
            <div
                ref={containerRef}
                className={`h-full w-full transition-opacity duration-200 ${isOpeningFile || !activeFile ? 'opacity-0' : 'opacity-100'}`}
            />
        </div>
    );
};