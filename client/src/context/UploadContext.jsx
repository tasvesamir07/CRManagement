import React, { createContext, useState, useContext, useRef } from 'react';
import { filesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Check, AlertCircle, Loader2, Minimize2, Maximize2, FileText } from 'lucide-react';

const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
    const [uploads, setUploads] = useState([]);
    const [isWidgetVisible, setIsWidgetVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    
    // Store AbortControllers in a ref to persist across renders without causing re-renders
    const abortControllers = useRef({});

    const uploadSingleFile = async (file, folderId, overwrite = false) => {
        const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const controller = new AbortController();
        abortControllers.current[uploadId] = controller;

        const newUpload = {
            id: uploadId,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'uploading', // 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
            folderId: folderId
        };

        setUploads(prev => [newUpload, ...prev]);
        setIsWidgetVisible(true);

        try {
            const uploadFn = overwrite ? filesAPI.uploadWithOverwrite : filesAPI.upload;
            await uploadFn(
                file,
                folderId,
                (progressEvent) => {
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
        } catch (err) {
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

    const uploadFiles = async (fileList, folderId) => {
        if (!fileList || fileList.length === 0) return;

        // Fetch current storage usage to check limit
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
            
            // Check duplicate
            filesAPI.checkDuplicate(file.name, folderId).then(dupCheck => {
                if (dupCheck.duplicate) {
                    if (window.confirm(`A file named "${file.name}" already exists in this folder. Do you want to overwrite it?`)) {
                        uploadSingleFile(file, folderId, true);
                    }
                } else {
                    uploadSingleFile(file, folderId, false);
                }
            }).catch(() => {
                // If duplicate check fails, proceed with standard upload
                uploadSingleFile(file, folderId, false);
            });
        });
    };

    const cancelUpload = (uploadId) => {
        const controller = abortControllers.current[uploadId];
        if (controller) {
            controller.abort();
        }
    };

    const clearFinishedUploads = () => {
        setUploads(prev => prev.filter(u => u.status === 'uploading'));
        setIsWidgetVisible(false);
    };

    // Calculate totals for summary
    const activeUploadsCount = uploads.filter(u => u.status === 'uploading').length;
    const completedUploadsCount = uploads.filter(u => u.status === 'completed').length;
    const totalUploadsCount = uploads.length;

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <UploadContext.Provider value={{ uploads, uploadFiles, cancelUpload, clearFinishedUploads, isWidgetVisible, setIsWidgetVisible }}>
            {children}
            {isWidgetVisible && totalUploadsCount > 0 && (
                <div className="fixed bottom-4 right-4 w-80 md:w-96 bg-canvas border border-hairline rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden max-h-96 transition-all duration-200">
                    {/* Header */}
                    <div 
                        className="bg-primary hover:bg-primary-deep text-on-primary px-4 py-3 flex items-center justify-between font-sans select-none cursor-pointer" 
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-2">
                            {activeUploadsCount > 0 ? (
                                <Loader2 className="w-4 h-4 animate-spin text-on-primary" />
                            ) : (
                                <Check className="w-4 h-4 text-on-primary" />
                            )}
                            <span className="text-sm font-semibold text-on-primary">
                                {activeUploadsCount > 0 
                                    ? `Uploading ${activeUploadsCount} file${activeUploadsCount > 1 ? 's' : ''}...` 
                                    : `${completedUploadsCount} upload${completedUploadsCount !== 1 ? 's' : ''} completed`
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1 hover:bg-on-primary/10 rounded transition-colors text-on-primary cursor-pointer"
                                title={isMinimized ? "Expand" : "Minimize"}
                            >
                                {isMinimized ? <Maximize2 className="w-4 h-4 text-on-primary" /> : <Minimize2 className="w-4 h-4 text-on-primary" />}
                            </button>
                            {activeUploadsCount === 0 && (
                                <button 
                                    onClick={clearFinishedUploads}
                                    className="p-1 hover:bg-on-primary/10 rounded transition-colors text-on-primary cursor-pointer"
                                    title="Close"
                                >
                                    <X className="w-4 h-4 text-on-primary" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Detailed List */}
                    {!isMinimized && (
                        <div className="flex-1 overflow-y-auto divide-y divide-hairline bg-canvas">
                            {uploads.map(item => (
                                <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs font-sans">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <FileText className="w-4 h-4 text-ink-mute shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-ink font-medium truncate" title={item.name}>
                                                {item.name}
                                            </div>
                                            <div className="text-[10px] text-ink-mute mt-0.5">
                                                {formatSize(item.size)}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {item.status === 'uploading' && (
                                                    <>
                                                        <div className="flex-1 bg-hairline rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-primary h-full rounded-full transition-all duration-150" style={{ width: `${item.progress}%` }} />
                                                        </div>
                                                        <span className="text-[10px] text-ink-mute shrink-0 font-bold">{item.progress}%</span>
                                                    </>
                                                )}
                                                {item.status === 'completed' && (
                                                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                        <Check className="w-3.5 h-3.5" /> Completed
                                                    </span>
                                                )}
                                                {item.status === 'cancelled' && (
                                                    <span className="text-[10px] text-ink-mute font-bold">
                                                        Cancelled
                                                    </span>
                                                )}
                                                {item.status === 'failed' && (
                                                    <span className="text-[10px] text-accent-tomato font-bold flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center pl-2">
                                        <button
                                            onClick={() => cancelUpload(item.id)}
                                            disabled={item.status !== 'uploading' || item.progress === 100}
                                            className={`p-1 rounded-full transition-colors ${
                                                item.status === 'uploading' && item.progress < 100
                                                    ? 'text-ink-mute hover:bg-canvas-soft hover:text-ink cursor-pointer'
                                                    : 'text-ink-mute/30 cursor-not-allowed'
                                            }`}
                                            title={item.progress === 100 ? "Upload complete" : "Cancel upload"}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </UploadContext.Provider>
    );
};

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};
