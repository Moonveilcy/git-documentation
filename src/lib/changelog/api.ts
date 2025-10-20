import { ChangelogCommit } from '../../types/changelog';

const GITHUB_API_BASE = "https://api.github.com";
const githubApiFetch = async (url: string, token: string, options: RequestInit = {}) => {
    const response = await fetch(`${GITHUB_API_BASE}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `token ${token.trim()}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `GitHub API Error: ${response.statusText}` }));
        if (response.status === 401) {
            throw new Error("Authentication failed. Please check if your GitHub token is correct and has the required permissions.");
        }
        throw new Error(errorData.message || 'An unknown GitHub API error occurred.');
    }
    return response.json();
};

export const getCommitsBetweenRefs = async (repo: string, base: string, head: string, token: string): Promise<ChangelogCommit[]> => {
    try {
        const data = await githubApiFetch(`/repos/${repo}/compare/${base}...${head}`, token);
        if (!data.commits || data.commits.length === 0) {
            return [];
        }
        return data.commits.map((c: any) => ({
            message: c.commit.message,
            sha: c.sha
        }));
    } catch (error) {
        console.error("Failed to fetch commits:", error);
        throw new Error("Could not fetch commits. Ensure the repo name and references are correct and your token has 'repo' scope.");
    }
};

export const generateChangelogContent = async (prompt: string, geminiKey: string): Promise<string> => {
    if (!geminiKey.trim()) {
        throw new Error("Gemini API Key is required.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey.trim()}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
        throw new Error('Gemini API request failed.');
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
        throw new Error("Failed to extract content from Gemini API response.");
    }
    return content.replace(/```markdown|```/g, '').trim();
};