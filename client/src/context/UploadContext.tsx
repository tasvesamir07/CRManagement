import { createContext, useState, useContext, useRef, type ReactNode } from 'react';
import { filesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Check, AlertCircle, ChevronDown, ChevronUp, FileText, Presentation, File } from 'lucide-react';

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  folderId: number | null;
}

interface UploadContextValue {
  uploads: UploadItem[];
  uploadFiles: (fileList: FileList | File[], folderId: number | null) => Promise<void>;
  cancelUpload: (uploadId: string) => void;
  clearFinishedUploads: () => void;
  isWidgetVisible: boolean;
  setIsWidgetVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [isWidgetVisible, setIsWidgetVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const abortControllers = useRef<Record<string, AbortController>>({});

    const uploadSingleFile = async (file: File, folderId: number | null, overwrite = false) => {
        // eslint-disable-next-line react-hooks/purity
        const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const controller = new AbortController();
        abortControllers.current[uploadId] = controller;

        const newUpload: UploadItem = {
            id: uploadId,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'uploading',
            folderId: folderId
        };

        setUploads(prev => [newUpload, ...prev]);
        setIsWidgetVisible(true);

        try {
            const uploadFn = overwrite ? filesAPI.uploadWithOverwrite : filesAPI.upload;
            await uploadFn(
                file,
                folderId,
                (progressEvent: { loaded: number; total: number }) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploads(prev => prev.map(item =>
                        item.id === uploadId ? { ...item, progress } : item
                    ));
                },
                controller.signal
            );

            setUploads(prev => prev.map(item =>
                item.id === uploadId ? { ...item, status: 'completed', progress: 100 } : item
            ));

            delete abortControllers.current[uploadId];
        } catch (err: any) {
            const isCancelled = controller.signal.aborted;
            setUploads(prev => prev.map(item =>
                item.id === uploadId
                    ? { ...item, status: isCancelled ? 'cancelled' : 'failed' }
                    : item
            ));
            delete abortControllers.current[uploadId];

            if (!isCancelled) {
                toast.error(`Upload failed for "${file.name}": ${err.response?.data?.error || err.message}`);
            }
        }
    };

    const uploadFiles = async (fileList: FileList | File[], folderId: number | null) => {
        if (!fileList || fileList.length === 0) return;

        let currentUsage = { usedBytes: 0, limitBytes: 104857600 };
        try {
            currentUsage = await filesAPI.getStorageUsage();
        } catch (err) {
            console.error('Failed to fetch storage usage before upload:', err);
        }

        if (currentUsage.usedBytes >= currentUsage.limitBytes) {
            toast.error('Upload failed: Storage limit reached.');
            return;
        }

        const filesArray = Array.from(fileList);

        filesArray.forEach(file => {
            if (file.size > 50 * 1024 * 1024) {
                toast.error(`"${file.name}" exceeds the 50MB limit.`);
                return;
            }

            filesAPI.checkDuplicate(file.name, folderId != null ? String(folderId) : null).then(dupCheck => {
                if (dupCheck.duplicate) {
                    if (window.confirm(`A file named "${file.name}" already exists in this folder. Do you want to overwrite it?`)) {
                        uploadSingleFile(file, folderId, true);
                    }
                } else {
                    uploadSingleFile(file, folderId, false);
                }
            }).catch(() => {
                uploadSingleFile(file, folderId, false);
            });
        });
    };

    const cancelUpload = (uploadId: string) => {
        const controller = abortControllers.current[uploadId];
        if (controller) {
            controller.abort();
        }
    };

    const cancelAllUploads = () => {
        Object.keys(abortControllers.current).forEach(id => {
            const controller = abortControllers.current[id];
            if (controller) {
                controller.abort();
            }
        });
    };

    const clearFinishedUploads = () => {
        setUploads(prev => prev.filter(u => u.status === 'uploading'));
        setIsWidgetVisible(false);
    };

    const activeUploadsCount = uploads.filter(u => u.status === 'uploading').length;
    const completedUploadsCount = uploads.filter(u => u.status === 'completed').length;
    const totalUploadsCount = uploads.length;

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        if (['ppt', 'pptx'].includes(ext)) {
            return <Presentation className="w-4.5 h-4.5 text-[#d24628] shrink-0" />;
        }
        if (ext === 'pdf') {
            return <FileText className="w-4.5 h-4.5 text-[#ea4335] shrink-0" />;
        }
        return <File className="w-4.5 h-4.5 text-gray-400 shrink-0" />;
    };

    return (
        <UploadContext.Provider value={{ uploads, uploadFiles, cancelUpload, clearFinishedUploads, isWidgetVisible, setIsWidgetVisible }}>
            {children}
            {isWidgetVisible && totalUploadsCount > 0 && (
                <div className="fixed bottom-0 right-4 w-80 md:w-96 bg-white border border-[#dadce0] shadow-2xl z-[9999] flex flex-col rounded-t-xl overflow-hidden max-h-96 transition-all duration-200">
                    <div
                        className="bg-[#202124] text-white px-4 py-3 flex items-center justify-between font-sans select-none cursor-pointer"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <span className="text-[14px] font-semibold text-white">
                            {activeUploadsCount > 0
                                ? `Uploading ${activeUploadsCount} item${activeUploadsCount > 1 ? 's' : ''}`
                                : `${completedUploadsCount} upload${completedUploadsCount !== 1 ? 's' : ''} complete`
                            }
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1 hover:bg-white/10 rounded transition-colors text-white cursor-pointer"
                                title={isMinimized ? "Expand" : "Minimize"}
                            >
                                {isMinimized ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />}
                            </button>
                            {activeUploadsCount === 0 && (
                                <button
                                    onClick={clearFinishedUploads}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-white cursor-pointer"
                                    title="Close"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {activeUploadsCount > 0 && (
                                <div className="bg-[#e8f0fe] text-[#1a73e8] px-4 py-2.5 flex items-center justify-between text-xs font-semibold border-b border-[#d2e3fc] font-sans">
                                    <span>
                                        {uploads[0]?.progress === 0 ? "Starting upload..." : "Uploading..."}
                                    </span>
                                    <button
                                        onClick={cancelAllUploads}
                                        className="text-[#1a73e8] hover:text-[#174ea6] hover:underline cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto divide-y divide-[#f1f3f4] bg-white max-h-64">
                                {uploads.map(item => {
                                    const radius = 8;
                                    const stroke = 2;
                                    const circumference = 2 * Math.PI * radius;
                                    const strokeDashoffset = circumference - (item.progress / 100) * circumference;

                                    return (
                                        <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs bg-white text-[#202124] hover:bg-[#f8f9fa] font-sans">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {getFileIcon(item.name)}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] text-[#202124] font-normal truncate" title={item.name}>
                                                        {item.name}
                                                    </div>
                                                    {item.status === 'failed' && (
                                                        <span className="text-[10px] text-[#ea4335] mt-0.5 block">Upload failed</span>
                                                    )}
                                                    {item.status === 'cancelled' && (
                                                        <span className="text-[10px] text-gray-500 mt-0.5 block">Cancelled</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center pl-2">
                                                {item.status === 'uploading' && (
                                                    <div className="relative w-5 h-5 flex items-center justify-center group/circle">
                                                        <div className="group-hover/circle:hidden flex items-center justify-center">
                                                            <svg className="w-5 h-5 -rotate-90">
                                                                <circle
                                                                    stroke="#e8eaed"
                                                                    fill="transparent"
                                                                    strokeWidth={stroke}
                                                                    r={radius}
                                                                    cx="10"
                                                                    cy="10"
                                                                />
                                                                <circle
                                                                    stroke="#1a73e8"
                                                                    fill="transparent"
                                                                    strokeWidth={stroke}
                                                                    strokeDasharray={`${circumference} ${circumference}`}
                                                                    style={{ strokeDashoffset }}
                                                                    r={radius}
                                                                    cx="10"
                                                                    cy="10"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <button
                                                            onClick={() => cancelUpload(item.id)}
                                                            disabled={item.progress === 100}
                                                            className={`hidden group-hover/circle:flex w-5 h-5 items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer ${
                                                                item.progress === 100 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600'
                                                            }`}
                                                            title={item.progress === 100 ? "Upload complete" : "Cancel upload"}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}

                                                {item.status === 'completed' && (
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                    </div>
                                                )}

                                                {item.status === 'cancelled' && (
                                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                        <X className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                )}

                                                {item.status === 'failed' && (
                                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </UploadContext.Provider>
    );
};

export const useUpload = (): UploadContextValue => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};
