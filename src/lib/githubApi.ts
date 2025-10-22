import { RepoFile } from "../types/commit";

const GITHUB_API_BASE = "https://api.github.com";
const apiFetch = async (url: string, token: string, options: RequestInit = {}) => {
    const response = await fetch(`${GITHUB_API_BASE}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `GitHub API request failed: ${response.statusText}`);
    }
    if (response.status === 204) return null;
    return response.json();
};

export const scanRepoTree = (repo: string, branch: string, token: string) => 
    apiFetch(`/repos/${repo}/git/trees/${branch}?recursive=1`, token.trim());

export const fetchCommits = (repo: string, branch: string, token: string) =>
    apiFetch(`/repos/${repo}/commits?sha=${branch}&per_page=10`, token.trim());

export const getFileContent = async (repo: string, path: string, branch: string, token: string) => {
    try {
        const data = await apiFetch(`/repos/${repo}/contents/${path}?ref=${branch}`, token.trim());
        return data ? atob(data.content) : "";
    } catch (error) {
        if ((error as Error).message.includes("Not Found")) {
            return "";
        }
        throw error;
    }
};

const getLatestCommitSha = (repo: string, branch: string, token: string) =>
    apiFetch(`/repos/${repo}/git/ref/heads/${branch}`, token.trim()).then(data => data.object.sha);

const getTreeForCommit = (repo: string, commitSha: string, token: string) =>
    apiFetch(`/repos/${repo}/git/commits/${commitSha}`, token.trim()).then(data => data.tree.sha);

const createBlob = (repo: string, content: string, token: string) =>
    apiFetch(`/repos/${repo}/git/blobs`, token.trim(), {
        method: 'POST',
        body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }),
    }).then(data => data.sha);

const createTree = (repo: string, baseTreeSha: string, tree: { path: string; mode?: string; type?: string; sha: string | null }[], token: string) =>
    apiFetch(`/repos/${repo}/git/trees`, token.trim(), {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    }).then(data => data.sha);

const createCommit = (repo: string, message: string, treeSha: string, parentCommitSha: string, token: string) =>
    apiFetch(`/repos/${repo}/git/commits`, token.trim(), {
        method: 'POST',
        body: JSON.stringify({ message, tree: treeSha, parents: [parentCommitSha] }),
    }).then(data => data.sha);

const updateBranchRef = (repo: string, branch: string, commitSha: string, token: string) =>
    apiFetch(`/repos/${repo}/git/refs/heads/${branch}`, token.trim(), {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha }),
    });

// --- PERUBAHAN DI SINI ---
// Fungsi ini sekarang BANYAK lebih sederhana
const createIndividualCommitMessage = (file: RepoFile): string => {
    // Fungsi getScope dan variabel scope telah dihapus.
    const description = file.commitMessage || `update ${file.name}`;
    // Format pesan commit sekarang tidak lagi menyertakan (scope)
    return `${file.commitType}: ${description}`;
};

export const commitMultipleFiles = async (
    repo: string, branch: string, token: string, files: RepoFile[]
) => {
    const cleanToken = token.trim();
    let parentCommitSha = await getLatestCommitSha(repo, branch, cleanToken);

    for (const file of files) {
        const baseTreeSha = await getTreeForCommit(repo, parentCommitSha, cleanToken);
        const blobSha = await createBlob(repo, file.content, cleanToken);
        
        const tree = [{ path: file.path, mode: '100644', type: 'blob', sha: blobSha }];

        const newTreeSha = await createTree(repo, baseTreeSha, tree, cleanToken);
        const commitMessage = createIndividualCommitMessage(file); // Ini sekarang akan memanggil fungsi yang sudah diubah
        const newCommitSha = await createCommit(repo, commitMessage, newTreeSha, parentCommitSha, cleanToken);
        
        parentCommitSha = newCommitSha;
    }

    await updateBranchRef(repo, branch, parentCommitSha, cleanToken);
    return parentCommitSha;
};

export const deletePaths = async (
    repo: string, branch: string, token: string, pathToDelete: string, fullTree: { path: string, type: string }[]
) => {
    const cleanToken = token.trim();
    const parentCommitSha = await getLatestCommitSha(repo, branch, cleanToken);
    const baseTreeSha = await getTreeForCommit(repo, parentCommitSha, cleanToken);

    const isFolder = !pathToDelete.split('/').pop()?.includes('.');
    
    const pathsToRemove = isFolder
        ? fullTree.filter(item => item.path.startsWith(pathToDelete + '/')).map(item => item.path)
        : [pathToDelete];
    
    if (fullTree.some(item => item.path === pathToDelete && item.type === 'blob')) {
        pathsToRemove.push(pathToDelete);
    }
    
    if (pathsToRemove.length === 0) {
        throw new Error(`Path '${pathToDelete}' not found in the repository.`);
    }

    const tree = pathsToRemove.map(path => ({
        path: path,
        mode: '100644',
        type: 'blob',
        sha: null 
    }));
    
    const newTreeSha = await createTree(repo, baseTreeSha, tree, cleanToken);
    
    const commitMessage = `chore: remove ${isFolder ? 'folder' : 'file'} ${pathToDelete}`;
    const newCommitSha = await createCommit(repo, commitMessage, newTreeSha, parentCommitSha, cleanToken);
    
    await updateBranchRef(repo, branch, newCommitSha, cleanToken);
    return newCommitSha;
};