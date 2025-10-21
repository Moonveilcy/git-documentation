import { useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { UnapologeticButton } from '../commit/Shared';
import { GitCommit } from 'lucide-react';

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
    
    // Konversi Set ke Array untuk me-render
    const stagedFilesArray = Array.from(editor.stagedFiles);

    return (
        <div className="p-4 h-full flex flex-col bg-gray-50 text-sm">
            <h3 className="text-base font-bold mb-4 border-b pb-2">Source Control</h3>
            
            {!editor.workspace?.isCloned ? (
                 <div className="space-y-3">
                    <label className="font-semibold text-gray-700">Clone Repository</label>
                    <input
                        type="text"
                        placeholder="URL atau format user/repo"
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-purple-500 focus:border-purple-500"
                    />
                    <input
                        type="text"
                        placeholder="Branch (e.g., main)"
                        value={branchInput}
                        onChange={(e) => setBranchInput(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-purple-500 focus:border-purple-500"
                    />
                    <UnapologeticButton onClick={handleClone} disabled={editor.isLoading} variant="primary" className="w-full">
                        {editor.isLoading ? 'Cloning...' : 'Clone'}
                    </UnapologeticButton>
                </div>
            ) : (
                <div className="flex-grow flex flex-col justify-between min-h-0">
                    <div className='flex-grow flex flex-col min-h-0'>
                        <label className="font-semibold text-gray-700">Commit Changes</label>
                        <textarea
                            placeholder="Tulis pesan commit di sini..."
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            className="w-full p-2 mt-2 border rounded h-24 focus:ring-blue-500 focus:border-blue-500"
                            disabled={stagedFilesArray.length === 0}
                        />
                        <div className='mt-3'>
                            <p className="text-xs text-gray-600 mb-2 font-medium">
                               {stagedFilesArray.length} file siap di-commit:
                            </p>
                            {stagedFilesArray.length > 0 ? (
                                <div className='border rounded-md bg-white p-2 text-xs text-gray-800 space-y-1 overflow-y-auto max-h-40'>
                                    {stagedFilesArray.map(file => (
                                        <div key={file} className='truncate' title={file}>{file.split('/').pop()}</div>
                                    ))}
                                </div>
                            ) : (
                                <div className='border rounded-md bg-white p-2 text-xs text-gray-500 text-center italic'>
                                    Tidak ada perubahan. Klik "Save" di editor untuk menambahkan file.
                                </div>
                            )}
                        </div>
                    </div>
                    <UnapologeticButton onClick={handleCommit} disabled={editor.isLoading || stagedFilesArray.length === 0} variant="secondary" className="w-full mt-4">
                        <GitCommit size={16} />
                         <span>{editor.isLoading ? 'Committing...' : `Commit ${stagedFilesArray.length} File(s)`}</span>
                    </UnapologeticButton>
                </div>
            )}
             <div className="mt-4 pt-4 border-t">
                 <label className="font-semibold text-gray-700">Konfigurasi</label>
                 <input
                    type="password"
                    placeholder="GitHub Personal Access Token"
                    value={editor.token}
                    onChange={(e) => {
                        const val = e.target.value;
                        editor.setToken(val);
                        localStorage.setItem('githubToken', val);
                    }}
                    className="w-full p-2 border rounded mt-2 focus:ring-gray-500 focus:border-gray-500"
                />
             </div>
        </div>
    );
};