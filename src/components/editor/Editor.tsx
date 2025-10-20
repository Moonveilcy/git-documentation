import React, { useEffect, useRef } from 'react';
import { ActiveFile } from '../../types/editor';

interface EditorProps {
    activeFile: ActiveFile | null;
    editedContent: string | null;
    onContentChange: (content: string) => void;
    isLoading: boolean;
}

export const Editor = ({ activeFile, editedContent, onContentChange, isLoading }: EditorProps) => {
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if ((window as any).monaco) {
            initializeMonaco();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js';
            script.onload = () => {
                (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
                (window as any).require(['vs/editor/editor.main'], initializeMonaco);
            };
            document.body.appendChild(script);
        }

        return () => {
            editorRef.current?.dispose();
        };
    }, []);
    
    useEffect(() => {
        if (editorRef.current && activeFile && editedContent !== editorRef.current.getValue()) {
            editorRef.current.setValue(editedContent || '');
        }
    }, [activeFile, editedContent]);

    const initializeMonaco = () => {
        if (containerRef.current && !editorRef.current) {
            editorRef.current = (window as any).monaco.editor.create(containerRef.current, {
                value: editedContent || '',
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
            });
            editorRef.current.onDidChangeModelContent(() => {
                onContentChange(editorRef.current.getValue());
            });
        }
    };

    if (isLoading) return <div className="flex-grow flex items-center justify-center bg-gray-800 text-white">Loading file...</div>;

    return (
        <div className="flex-grow w-full h-full" ref={containerRef} />
    );
};