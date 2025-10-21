import { Workspace, RepoTreeItem } from '../../types/editor';

/**
 * Menghapus sebuah node (file atau folder) dari workspace tree.
 * @param workspace Workspace saat ini.
 * @param pathToDelete Path lengkap dari node yang akan dihapus.
 * @returns Workspace baru setelah node dihapus.
 */
export const deleteNodeFromTree = (workspace: Workspace, pathToDelete: string): Workspace => {
    const isFolder = !pathToDelete.split('/').pop()?.includes('.');
    
    const newTree = workspace.tree.filter(item => {
        // Jika folder, hapus semua item yang dimulai dengan path folder tersebut
        if (isFolder) {
            return !item.path.startsWith(pathToDelete);
        }
        // Jika file, hapus hanya file itu
        return item.path !== pathToDelete;
    });

    return { ...workspace, tree: newTree };
};

/**
 * Membuat node baru (file atau folder) di dalam workspace tree.
 * @param workspace Workspace saat ini.
 * @param newPath Path lengkap dari node baru.
 * @param type Tipe node ('file' atau 'folder').
 * @returns Workspace baru setelah node ditambahkan.
 */
export const createNodeInTree = (workspace: Workspace, newPath: string, type: 'file' | 'folder'): Workspace => {
    // Untuk folder, kita buat file .gitkeep agar direktori kosong bisa di-commit
    const finalPath = type === 'folder' ? `${newPath}/.gitkeep` : newPath;

    const newItem: RepoTreeItem = {
        path: finalPath,
        type: 'blob', // Selalu 'blob' untuk file baru, termasuk .gitkeep
        sha: '', // SHA kosong karena belum ada di GitHub
        url: ''
    };

    return { ...workspace, tree: [...workspace.tree, newItem] };
};

/**
 * Mengganti nama sebuah node (file atau folder) di dalam workspace tree.
 * @param workspace Workspace saat ini.
 * @param oldPath Path lama.
 * @param newPath Path baru.
 * @returns Workspace baru setelah nama diganti.
 */
export const renameNodeInTree = (workspace: Workspace, oldPath: string, newPath: string): Workspace => {
     const isFolder = !oldPath.split('/').pop()?.includes('.');

     const newTree = workspace.tree.map(item => {
        if (isFolder && item.path.startsWith(oldPath)) {
            // Ganti prefix path untuk semua item di dalam folder
            return { ...item, path: item.path.replace(oldPath, newPath) };
        }
        if (item.path === oldPath) {
            return { ...item, path: newPath };
        }
        return item;
    });

    return { ...workspace, tree: newTree };
};