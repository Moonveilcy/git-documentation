import { useState } from 'react';
import { useEditor } from '../../hooks/useEditor';

interface SourceControlProps {
    editor: ReturnType<typeof useEditor>;
}

const parseRepoUrl = (url: string) => {
    try {
        if (!url.startsWith('http')) return url;
        const path = new URL(url).pathname;
        return path.substring(1).split('/').slice(0, 2).join('/');
    } catch {
        return url;
    }
};

export const SourceControl = ({ editor }: SourceControlProps) => {
    // FIX: Hapus nilai default 'Gaeuly/veilcy-cloner'
    const [repoInput, setRepoInput] = useState(''); 
    const [branchInput, setBranchInput] = useState('main');
    const [commitMessage, setCommitMessage] = useState('');

    const handleClone = () => {
        const parsedRepo = parseRepoUrl(repoInput);
        if (parsedRepo) {
            editor.handleCloneRepo(parsedRepo, branchInput);
        } else {
            editor.setNotification({ message: 'Invalid repository URL or format.', type: 'error' });
        }
    };
    
    const handleCommit = () => {
        if (!commitMessage.trim()) {
            editor.setNotification({ message: 'Commit message cannot be empty.', type: 'error' });
            return;
        }
        editor.handleCommit(commitMessage);
        setCommitMessage('');
    };

    return (
        <div className="p-4 h-full flex flex-col bg-gray-50">
            <h3 className="text-lg font-bold mb-4">Source Control</h3>
            
            {!editor.workspace?.isCloned ? (
                 <div className="space-y-3">
                    <h4 className="font-semibold">Clone Repository</h4>
                    <input
                        type="text"
                        placeholder="URL or user/repo"
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="text"
                        value={branchInput}
                        onChange={(e) => setBranchInput(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                    <button onClick={handleClone} disabled={editor.isLoading} className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300">
                        {editor.isLoading ? 'Cloning...' : 'Clone'}
                    </button>
                </div>
            ) : (
                <div className="flex-grow flex flex-col justify-between">
                    <div>
                        <h4 className="font-semibold">Commit Changes</h4>
                        <p className="text-sm text-gray-500 mb-2">
                           {editor.stagedFiles.size} file(s) ready to commit.
                        </p>
                        <textarea
                            placeholder="Commit message"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            className="w-full p-2 border rounded h-24"
                            disabled={editor.stagedFiles.size === 0}
                        />
                    </div>
                    <button onClick={handleCommit} disabled={editor.isLoading || editor.stagedFiles.size === 0} className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300">
                         {editor.isLoading ? 'Committing...' : `Commit ${editor.stagedFiles.size} File(s)`}
                    </button>
                </div>
            )}
             <div className="mt-4 pt-4 border-t">
                 <h4 className="font-semibold">Configuration</h4>
                 <input
                    type="password"
                    placeholder="GitHub Token"
                    value={editor.token}
                    onChange={(e) => editor.setToken(e.target.value)}
                    className="w-full p-2 border rounded mt-2"
                />
             </div>
        </div>
    );
};


