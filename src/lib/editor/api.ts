import { ActiveFile } from '../../types/editor';

const GITHUB_API_BASE = "https://api.github.com";

const apiFetch = async (url: string, token: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
    };
    
    if (token && token.trim()) {
        headers['Authorization'] = `token ${token.trim()}`;
    }

    const response = await fetch(`${GITHUB_API_BASE}${url}`, { ...options, headers });

    if (!response.ok) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
            throw new Error("GitHub API rate limit exceeded. Please add a token or wait an hour.");
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204 || response.status === 201) return null;

    return response.json();
};


export const scanRepoTree = (repo: string, branch: string, token: string) => 
    apiFetch(`/repos/${repo}/git/trees/${branch}?recursive=1`, token);

export const getFileContent = async (repo: string, path: string, branch: string, token: string): Promise<string> => {
    try {
        const data = await apiFetch(`/repos/${repo}/contents/${path}?ref=${branch}`, token);
        return data && data.content ? atob(data.content.replace(/\s/g, '')) : "";
    } catch (error) {
        if ((error as Error).message.toLowerCase().includes("not found")) {
            return "";
        }
        throw error;
    }
};

const getLatestCommitSha = async (repo: string, branch: string, token: string): Promise<string> => {
    const data = await apiFetch(`/repos/${repo}/git/ref/heads/${branch}`, token);
    return data.object.sha;
}

const getTreeForCommit = async (repo: string, commitSha: string, token: string): Promise<string> => {
    const data = await apiFetch(`/repos/${repo}/git/commits/${commitSha}`, token);
    return data.tree.sha;
}

const createBlob = async (repo: string, content: string, token: string): Promise<string> => {
    const data = await apiFetch(`/repos/${repo}/git/blobs`, token, {
        method: 'POST',
        body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }),
    });
    return data.sha;
}

const createTree = async (repo: string, baseTreeSha: string, tree: { path: string; mode?: string; type?: string; sha: string | null }[], token: string): Promise<string> => {
    const data = await apiFetch(`/repos/${repo}/git/trees`, token, {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    });
    return data.sha;
}

const createCommit = async (repo: string, message: string, treeSha: string, parentCommitSha: string, token: string): Promise<string> => {
    const data = await apiFetch(`/repos/${repo}/git/commits`, token, {
        method: 'POST',
        body: JSON.stringify({ message, tree: treeSha, parents: [parentCommitSha] }),
    });
    return data.sha;
}

const updateBranchRef = async (repo: string, branch: string, commitSha: string, token: string): Promise<void> => {
    await apiFetch(`/repos/${repo}/git/refs/heads/${branch}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha }),
    });
}

export const commitFiles = async (repo: string, branch: string, token: string, files: Array<{ path: string; content: string | null }>, commitMessage: string) => {
    const parentCommitSha = await getLatestCommitSha(repo, branch, token);
    const baseTreeSha = await getTreeForCommit(repo, parentCommitSha, token);
    
    const treePromises = files.map(async file => {
        if (file.content === null) {
            return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: null };
        } else {
            const blobSha = await createBlob(repo, file.content, token);
            return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: blobSha };
        }
    });

    const tree = await Promise.all(treePromises);
    const newTreeSha = await createTree(repo, baseTreeSha, tree, token);
    const newCommitSha = await createCommit(repo, commitMessage, newTreeSha, parentCommitSha, token);
    await updateBranchRef(repo, branch, newCommitSha, token);
    return newCommitSha;
};