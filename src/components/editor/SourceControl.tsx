import { useState } from 'react';
import { UnapologeticButton } from '../commit/Shared';
import { useEditor } from '../../hooks/useEditor';

const parseRepoInput = (input: string): string => {
    try {
        if (input.startsWith('http')) {
            const url = new URL(input);
            const pathParts = url.pathname.split('/').filter(part => part);
            if (pathParts.length >= 2) {
                return `${pathParts[0]}/${pathParts[1]}`;
            }
        }
    } catch (e) { /* Invalid URL, treat as path */ }
    return input.trim();
};

interface SourceControlProps {
    editor: ReturnType<typeof useEditor>;
}

export const SourceControl = ({ editor }: SourceControlProps) => {
    const [repoInput, setRepoInput] = useState('Gaeuly/veilcy-cloner');
    const [branchToClone, setBranchToClone] = useState('main');
    const [commitMessage, setCommitMessage] = useState('');

    const handleClone = () => {
        const repoPath = parseRepoInput(repoInput);
        if (!repoPath.includes('/')) {
            editor.setNotification({ message: 'Invalid repository format. Use URL or username/repo.', type: 'error' });
            return;
        }
        editor.handleCloneRepo(repoPath, branchToClone);
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
        <div className="p-4 space-y-6">
            <div>
                <h3 className="font-bold mb-2">Clone Repository</h3>
                <div className="space-y-2">
                    <input type="text" placeholder="URL or username/repo" value={repoInput} onChange={e => setRepoInput(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                    <input type="text" placeholder="branch" value={branchToClone} onChange={e => setBranchToClone(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                    <UnapologeticButton onClick={handleClone} disabled={editor.isLoading} variant="secondary">
                        {editor.isLoading ? 'Cloning...' : 'Clone'}
                    </UnapologeticButton>
                </div>
            </div>

            {editor.workspace && (
                <div>
                    <h3 className="font-bold mb-2">Commit Changes</h3>
                    <p className="text-sm text-gray-600 mb-2">{editor.stagedFiles.size} staged changes.</p>
                    <textarea
                        placeholder="Commit message"
                        value={commitMessage}
                        onChange={e => setCommitMessage(e.target.value)}
                        className="w-full p-2 border-2 border-black rounded-md bg-white min-h-[60px]"
                    />
                    <UnapologeticButton onClick={handleCommit} disabled={editor.isLoading || editor.stagedFiles.size === 0} variant="primary" className="mt-2">
                        {editor.isLoading ? 'Committing...' : `Commit ${editor.stagedFiles.size} file(s)`}
                    </UnapologeticButton>
                </div>
            )}
             <div>
                <h3 className="font-bold mb-2">Configuration</h3>
                 <input type="password" placeholder="GitHub Token" value={editor.token} onChange={(e) => editor.setToken(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
            </div>
        </div>
    );
};