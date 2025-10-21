export interface RepoTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  url: string;
  size?: number;
}

export interface ActiveFile {
  path: string;
  content: string;
  originalContent: string;
  isNew?: boolean;
}

export type SidebarMode = 'files' | 'git';

export interface Workspace {
  owner: string;
  repo: string;
  branch: string;
  isCloned: boolean;
  tree: RepoTreeItem[];
}