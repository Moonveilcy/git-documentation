export interface RepoTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

export interface ActiveFile {
  path: string;
  content: string;
  originalContent: string;
}