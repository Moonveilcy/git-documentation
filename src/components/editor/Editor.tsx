import { useRef, useEffect } from 'react';
import { editor as MonacoEditor } from 'monaco-editor';
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
    const onContentChangeRef = useRef(onContentChange);
    onContentChangeRef.current = onContentChange;
    const activeFileRef = useRef(activeFile);
    activeFileRef.current = activeFile;

    useEffect(() => {
        let isDisposed = false;
        const monaco = (window as any).monaco;
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
                        initializeMonaco(monacoInstance);
                    });
                };
            } else {
                initializeMonaco(monaco);
            }
        }
        return () => {
            isDisposed = true;
            editorRef.current?.dispose();
            editorRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (editorRef.current && activeFile) {
            const model = editorRef.current.getModel();
            if (model && activeFile.content !== model.getValue()) {
                editorRef.current.executeEdits(null, [{
                    range: model.getFullModelRange(),
                    text: activeFile.content
                }]);
            }
            if (model) {
                 const language = getLanguageFromPath(activeFile.path);
                (window as any).monaco.editor.setModelLanguage(model, language);
            }
        }
    }, [activeFile]);

    const initializeMonaco = (monaco: any) => {
        if (containerRef.current && !editorRef.current) {
            editorRef.current = monaco.editor.create(containerRef.current, {
                value: '',
                language: 'plaintext',
                theme: 'vs-dark',
                automaticLayout: true,
                wordWrap: 'on',
                minimap: { enabled: false },
            });
            editorRef.current.onDidChangeModelContent(() => {
                const currentFile = activeFileRef.current;
                const currentValue = editorRef.current?.getValue();
                if (currentFile && currentValue !== currentFile.content) {
                    onContentChangeRef.current(currentFile.path, currentValue || '');
                }
            });
        }
    };

    return (
        <div className="h-full w-full relative bg-[#1e1e1e]">
            {(isOpeningFile || !activeFile) && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
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