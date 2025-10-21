import React, { useEffect, useRef } from 'react';
import { ActiveFile } from '../../types/editor';

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
        default:
            return 'plaintext';
    }
};

interface EditorProps {
    activeFile: ActiveFile | null;
    onContentChange: (content: string) => void;
    isLoading: boolean;
}

export const Editor = ({ activeFile, onContentChange, isLoading }: EditorProps) => {
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const onContentChangeRef = useRef(onContentChange);
    onContentChangeRef.current = onContentChange;

    useEffect(() => {
        const monaco = (window as any).monaco;
        if (monaco) {
            initializeMonaco(monaco);
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js';
            document.body.appendChild(script);
            script.onload = () => {
                const require = (window as any).require;
                require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
                require(['vs/editor/editor.main'], (monacoInstance: any) => {
                    initializeMonaco(monacoInstance);
                });
            };
        }
        return () => {
            editorRef.current?.dispose();
            editorRef.current = null;
        }
    }, []);
    
    useEffect(() => {
        if (editorRef.current && activeFile) {
            const model = editorRef.current.getModel();
            const language = getLanguageFromPath(activeFile.path);

            if (activeFile.content !== model.getValue()) {
                model.setValue(activeFile.content);
            }
            
            if (model.getLanguageId() !== language) {
                (window as any).monaco.editor.setModelLanguage(model, language);
            }
        } else if (editorRef.current && !activeFile) {
            editorRef.current.getModel()?.setValue('');
        }
    }, [activeFile]);

    const initializeMonaco = (monaco: any) => {
        if (containerRef.current && !editorRef.current) {
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                target: monaco.languages.typescript.ScriptTarget.ESNext,
                allowNonTsExtensions: true,
            });
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: false,
                noSyntaxValidation: false,
            });

            editorRef.current = monaco.editor.create(containerRef.current, {
                value: activeFile?.content || '',
                language: activeFile ? getLanguageFromPath(activeFile.path) : 'plaintext',
                theme: 'vs-dark',
                automaticLayout: true,
            });
            editorRef.current.onDidChangeModelContent(() => {
                if (activeFile) {
                     onContentChangeRef.current(editorRef.current.getValue());
                }
            });
        }
    };

    if (isLoading) return <div className="flex-grow flex items-center justify-center bg-gray-800 text-white">Loading file...</div>;

    return <div className="w-full h-full" ref={containerRef} />;
};