import { useState } from 'react';
import { UnapologeticButton } from '../commit/Shared';
import { useEditor } from '../../hooks/useEditor';

interface SourceControlProps {
    editor: ReturnType<typeof useEditor>;
}

export const SourceControl = ({ editor }: SourceControlProps) => {
    const [repoToClone, setRepoToClone] = useState('Gaeuly/veilcy-cloner');
    const [branchToClone, setBranchToClone] = useState('main');
    const [commitMessage, setCommitMessage] = useState('');

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
                    <input type="text" placeholder="username/repo" value={repoToClone} onChange={e => setRepoToClone(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                    <input type="text" placeholder="branch" value={branchToClone} onChange={e => setBranchToClone(e.target.value)} className="w-full p-2 border-2 border-black rounded-md bg-white"/>
                    <UnapologeticButton onClick={() => editor.handleCloneRepo(repoToClone, branchToClone)} disabled={editor.isLoading} variant="secondary">
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