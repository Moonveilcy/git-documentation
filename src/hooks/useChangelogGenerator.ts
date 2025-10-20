import { useState, useCallback, useEffect } from 'react';
import * as changelogApi from '../lib/changelog/api';
import { createChangelogPrompt } from '../lib/changelog/prompt';
import { NotificationType } from './useGithub';

export const useChangelogGenerator = () => {
    const [githubToken, setGithubToken] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [repo, setRepo] = useState('');
    const [startRef, setStartRef] = useState('');
    const [endRef, setEndRef] = useState('main');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedChangelog, setGeneratedChangelog] = useState('');
    const [notification, setNotification] = useState<NotificationType | null>(null);
    useEffect(() => {
        const storedGithubToken = localStorage.getItem('githubToken');
        const storedGeminiKey = localStorage.getItem('geminiApiKey');
        if (storedGithubToken) setGithubToken(storedGithubToken);
        if (storedGeminiKey) setGeminiKey(storedGeminiKey);
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!githubToken || !geminiKey || !repo || !startRef || !endRef) {
            setNotification({ message: 'Please fill all required fields.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setGeneratedChangelog('');
        setNotification(null);

        const cleanRepo = repo.trim().replace(/^\/|\/$/g, '');

        try {
            const commits = await changelogApi.getCommitsBetweenRefs(cleanRepo, startRef, endRef, githubToken);
            if (commits.length === 0) {
                setNotification({ message: 'No new commits found between the specified references.', type: 'success' });
                setIsLoading(false); // Stop loading if no commits
                return;
            }
            const commitMessages = commits.map(c => c.message);
            const prompt = createChangelogPrompt(commitMessages);          
            const changelogContent = await changelogApi.generateChangelogContent(prompt, geminiKey);
            
            setGeneratedChangelog(changelogContent);
            setNotification({ message: 'Changelog generated successfully!', type: 'success' });

        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [repo, startRef, endRef, githubToken, geminiKey]);

    return {
        githubToken, setGithubToken,
        geminiKey, setGeminiKey,
        repo, setRepo,
        startRef, setStartRef,
        endRef, setEndRef,
        isLoading,
        generatedChangelog,
        notification, setNotification,
        handleGenerate,
    };
};