import { useRef, useEffect } from 'react';
import { editor as MonacoEditor } from 'monaco-editor';
import { ActiveFile } from '../../types/editor';

// Fungsi helper untuk mendeteksi bahasa dari path file untuk syntax highlighting
const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'json':
            return 'json';
        case 'css':
            return 'css';
        case 'html':
            return 'html';
        case 'md':
            return 'markdown';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'go':
            return 'go';
        case 'php':
            return 'php';
        case 'rb':
            return 'ruby';
        default:
            return 'plaintext';
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
    
    // Efek untuk memuat dan menginisialisasi Monaco Editor sekali saja
    useEffect(() => {
        const monaco = (window as any).monaco;
        if (containerRef.current) {
            if (!monaco) {
                // Jika monaco belum ada di window, muat dari CDN
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js';
                document.body.appendChild(script);
                script.onload = () => {
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
            editorRef.current?.dispose();
            editorRef.current = null;
        };
    }, []);

    // Efek untuk mensinkronkan konten editor dengan file yang aktif
    useEffect(() => {
        if (editorRef.current && activeFile) {
            const model = editorRef.current.getModel();
            if (model) {
                // Hanya update value jika kontennya berbeda
                if (activeFile.content !== model.getValue()) {
                    model.setValue(activeFile.content);
                }
                // Set bahasa editor sesuai ekstensi file
                const language = getLanguageFromPath(activeFile.path);
                (window as any).monaco.editor.setModelLanguage(model, language);
            }
        }
    }, [activeFile]);

    const initializeMonaco = (monaco: any) => {
        if (containerRef.current && !editorRef.current) {
            // Konfigurasi dasar untuk validasi sintaks JavaScript/TypeScript
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: false,
                noSyntaxValidation: false,
            });
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                target: monaco.languages.typescript.ScriptTarget.ESNext,
                allowNonTsExtensions: true,
            });

            editorRef.current = monaco.editor.create(containerRef.current, {
                value: activeFile?.content || '',
                language: activeFile ? getLanguageFromPath(activeFile.path) : 'plaintext',
                theme: 'vs-dark',
                automaticLayout: true,
                wordWrap: 'on',
                minimap: { enabled: true },
            });

            // Listener untuk setiap perubahan konten di editor
            editorRef.current.onDidChangeModelContent(() => {
                if (activeFile && editorRef.current) {
                    onContentChangeRef.current(activeFile.path, editorRef.current.getValue());
                }
            });
        }
    };

    return (
        <div className="h-full w-full relative bg-[#1e1e1e]">
            {/* Tampilkan overlay loading saat file sedang dibuka */}
            {(isOpeningFile || !activeFile) && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-gray-400 text-lg animate-pulse">
                        {isOpeningFile ? `Opening ${isOpeningFile.split('/').pop()}...` : 'Select a file to start editing'}
                    </span>
                </div>
            )}
            {/* Kontainer untuk Monaco Editor */}
            <div
                ref={containerRef}
                className={`h-full w-full transition-opacity duration-200 ${isOpeningFile || !activeFile ? 'opacity-0' : 'opacity-100'}`}
            />
        </div>
    );
};