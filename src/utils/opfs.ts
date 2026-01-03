
export const saveToOPFS = async (fileName: string, data: File | Blob) => {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(fileName, { create: true });
    const writable = await (fileHandle as any).createWritable();
    try {
        await writable.write(data);
    } catch (err) {
        if (writable.abort) await writable.abort();
        throw err;
    } finally {
        await writable.close();
    }
    console.log(`Saved ${fileName} to disk.`);
}

export const deleteFromOPFS = async (fileName: string) => {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(fileName);
    console.log(`Deleted ${fileName} from disk.`);
}

export const existsInOPFS = async (fileName: string): Promise<boolean> => {
    try {
        const root = await navigator.storage.getDirectory();
        await root.getFileHandle(fileName);
        return true;
    } catch {
        return false;
    }
}

export const getFileFromOPFS = async (fileName: string): Promise<File | null> => {
    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(fileName);
        return await fileHandle.getFile();
    } catch {
        return null;
    }
}

export const clearAllOPFS = async () => {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of (root as any)) {
        await root.removeEntry(name, { recursive: true });
    }
    console.log("All files deleted from disk.");
}

export const getStorageEstimate = async () => {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const estimate = await navigator.storage.estimate();
    return {
        usageMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
        quotaMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
        percent: (((estimate.usage || 0) / (estimate.quota || 1)) * 100).toFixed(1)
    };
}

export const requestPersistence = async (): Promise<boolean> => {
    if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
    }
    return false;
}

export const isStoragePersistent = async (): Promise<boolean> => {
    if (navigator.storage && navigator.storage.persisted) {
        return await navigator.storage.persisted();
    }
    return false;
}


export const isLikelyIncognito = async (): Promise<boolean> => {
    if (!navigator.storage || !navigator.storage.estimate) return false;
    const est = await navigator.storage.estimate();
    const quotaMB = (est.quota || 0) / (1024 * 1024);
    const persisted = await isStoragePersistent();
    return !persisted && quotaMB > 0 && quotaMB < 700;
}