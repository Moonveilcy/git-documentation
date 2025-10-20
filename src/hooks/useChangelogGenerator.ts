import { useState, useCallback, useEffect } from 'react';
import * as changelogApi from '../lib/changelog/api';
import { createChangelogPrompt } from '../lib/changelog/prompt';
import { NotificationType } from './useGithub';

export const useChangelogGenerator = () => {
    // State for API keys and repository info
    const [githubToken, setGithubToken] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [repo, setRepo] = useState('');
    const [startRef, setStartRef] = useState('');
    const [endRef, setEndRef] = useState('main'); // Default to 'main' or 'HEAD'

    // State for application flow
    const [isLoading, setIsLoading] = useState(false);
    const [generatedChangelog, setGeneratedChangelog] = useState('');
    const [notification, setNotification] = useState<NotificationType | null>(null);

    // Load tokens from localStorage on initial render
    useEffect(() => {
        const storedGithubToken = localStorage.getItem('githubToken');
        const storedGeminiKey = localStorage.getItem('geminiApiKey'); // Assuming you store it under this key
        if (storedGithubToken) setGithubToken(storedGithubToken);
        if (storedGeminiKey) setGeminiKey(storedGeminiKey);
    }, []);

    const handleGenerate = useCallback(async () => {
        // --- Input Validation ---
        if (!githubToken || !geminiKey || !repo || !startRef || !endRef) {
            setNotification({ message: 'Please fill all required fields.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setGeneratedChangelog('');
        setNotification(null);

        // FIX: Sanitize the repo input to remove leading/trailing slashes
        const cleanRepo = repo.trim().replace(/^\/|\/$/g, '');

        try {
            // 1. Fetch commit messages from GitHub
            const commits = await changelogApi.getCommitsBetweenRefs(cleanRepo, startRef, endRef, githubToken);
            if (commits.length === 0) {
                setNotification({ message: 'No new commits found between the specified references.', type: 'success' });
                setIsLoading(false); // Stop loading if no commits
                return;
            }
            const commitMessages = commits.map(c => c.message);

            // 2. Create a prompt for Gemini
            const prompt = createChangelogPrompt(commitMessages);
            
            // 3. Generate changelog content using Gemini AI
            const changelogContent = await changelogApi.generateChangelogContent(prompt, geminiKey);
            
            setGeneratedChangelog(changelogContent);
            setNotification({ message: 'Changelog generated successfully!', type: 'success' });

        } catch (error) {
            setNotification({ message: (error as Error).message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [repo, startRef, endRef, githubToken, geminiKey]);

    // Return all state and handlers to be used by the component
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