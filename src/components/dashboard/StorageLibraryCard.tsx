import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listLibrary, getStorageUsage, type LibraryFile } from "@/lib/sessionsApi";
import { uploadDocument, deleteDocument, safeUploadError } from "@/lib/documentUpload";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, UploadCloud, Trash2, History, Library, Loader2 } from "lucide-react";
import { toast } from "sonner";

const statusVariant = (status: string) => {
  if (status === "processed") return "success" as const;
  if (status === "failed") return "warning" as const;
  return "info" as const;
};

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type BulkTarget = { scope: "library" | "history"; ids: string[] } | null;

export const StorageLibraryCard = () => {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [usage, setUsage] = useState<{ usedBytes: number; capBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LibraryFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "history">("library");
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState<BulkTarget>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    return Promise.all([listLibrary(), getStorageUsage()])
      .then(([libraryFiles, storageUsage]) => {
        setFiles(libraryFiles);
        setUsage(storageUsage);
      })
      .catch(() => { /* silent — falls back to empty state */ });
  };

  useEffect(() => {
    let cancelled = false;
    refresh().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const usedPct = usage ? Math.min(100, Math.round((usage.usedBytes / usage.capBytes) * 100)) : 0;
  // Library = files confirmed to actually be sitting in storage right now.
  // The documents row is only ever created once the client confirms the R2
  // PUT succeeded (see enqueue-document-processing), so queued/processing/
  // processed are the reliable on-disk states. "failed" never has bytes
  // either (cleaned up server-side). History = the full record of every
  // upload attempt regardless of outcome.
  const currentFiles = files.filter((file) =>
    file.processing_status === "queued" ||
    file.processing_status === "processing" ||
    file.processing_status === "processed"
  );

  const pruneSelection = (ids: Set<string>, validIds: Set<string>) => {
    const next = new Set([...ids].filter((id) => validIds.has(id)));
    return next.size === ids.size ? ids : next;
  };

  useEffect(() => {
    const currentIds = new Set(currentFiles.map((f) => f.document_id));
    const allIds = new Set(files.map((f) => f.document_id));
    setSelectedLibraryIds((prev) => pruneSelection(prev, currentIds));
    setSelectedHistoryIds((prev) => pruneSelection(prev, allIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectedFiles = Array.from(inputEl.files || []);
    if (!selectedFiles.length) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Please sign in before uploading study files.");
      inputEl.value = "";
      return;
    }

    setUploading(true);
    for (const file of selectedFiles) {
      try {
        await uploadDocument(file, session.access_token);
        toast.success(`${file.name} uploaded — processing in the background.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error || "");
        toast.error(`${file.name}: ${safeUploadError(message)}`);
      }
    }
    setUploading(false);
    inputEl.value = "";
    void refresh();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("AUTH_REQUIRED");
      await deleteDocument(pendingDelete.document_id, session.access_token);
      setFiles((prev) => prev.filter((file) => file.document_id !== pendingDelete.document_id));
      toast.success(`"${pendingDelete.file_name}" was deleted.`);
      setPendingDelete(null);
      void refresh();
    } catch {
      toast.error("Could not delete the file. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelection = (scope: "library" | "history", documentId: string) => {
    const setter = scope === "library" ? setSelectedLibraryIds : setSelectedHistoryIds;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  };

  const toggleSelectAll = (scope: "library" | "history", visibleFiles: LibraryFile[]) => {
    const selected = scope === "library" ? selectedLibraryIds : selectedHistoryIds;
    const setter = scope === "library" ? setSelectedLibraryIds : setSelectedHistoryIds;
    const allSelected = visibleFiles.length > 0 && visibleFiles.every((f) => selected.has(f.document_id));
    setter(allSelected ? new Set() : new Set(visibleFiles.map((f) => f.document_id)));
  };

  const handleConfirmBulkDelete = async () => {
    if (!pendingBulkDelete || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("AUTH_REQUIRED");

      const results = await Promise.allSettled(
        pendingBulkDelete.ids.map((id) => deleteDocument(id, session.access_token))
      );
      const failedCount = results.filter((r) => r.status === "rejected").length;
      const deletedIds = new Set(
        pendingBulkDelete.ids.filter((_, i) => results[i].status === "fulfilled")
      );

      setFiles((prev) => prev.filter((file) => !deletedIds.has(file.document_id)));
      if (pendingBulkDelete.scope === "library") setSelectedLibraryIds(new Set());
      else setSelectedHistoryIds(new Set());

      if (failedCount > 0) {
        toast.error(`Deleted ${deletedIds.size} file${deletedIds.size === 1 ? "" : "s"}, ${failedCount} failed. Please try again.`);
      } else {
        toast.success(`Deleted ${deletedIds.size} file${deletedIds.size === 1 ? "" : "s"}.`);
      }
      setPendingBulkDelete(null);
      void refresh();
    } catch {
      toast.error("Could not delete the selected files. Please try again.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const renderFileRow = (file: LibraryFile, showDate: boolean, scope: "library" | "history") => {
    const selected = scope === "library" ? selectedLibraryIds : selectedHistoryIds;
    return (
      <div key={file.document_id} className="flex items-center justify-between gap-2 rounded-xl bg-secondary/40 p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Checkbox
            checked={selected.has(file.document_id)}
            onCheckedChange={() => toggleSelection(scope, file.document_id)}
            aria-label={`Select ${file.file_name}`}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{file.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatMb(file.size_bytes)} MB{showDate ? ` · ${formatDateTime(file.created_at)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusChip label={file.processing_status} variant={statusVariant(file.processing_status)} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setPendingDelete(file)}
            aria-label={`Delete ${file.file_name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDeleteSelectedButton = (scope: "library" | "history") => {
    const selected = scope === "library" ? selectedLibraryIds : selectedHistoryIds;
    if (selected.size === 0) return null;
    return (
      <div className="flex justify-end px-1 pb-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 rounded-lg text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setPendingBulkDelete({ scope, ids: [...selected] })}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete {selected.size} selected
        </Button>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <HardDrive className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm">Storage &amp; Library</h2>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl" onClick={handleUploadClick} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          multiple
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {usage && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{formatMb(usage.usedBytes)} MB used</span>
            <span>{formatMb(usage.capBytes)} MB total</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usedPct > 90 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      )}

      {!loading && files.length === 0 && (
        <EmptyState
          icon={UploadCloud}
          title="Your library is empty"
          description="Upload a file here, or from the AI Tutor — it stays in your library permanently and can be reused as a source in any session."
          actionLabel="Upload a file"
          onAction={handleUploadClick}
        />
      )}

      {files.length > 0 && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "library" | "history")}>
          <div className="flex items-center justify-between mb-3 gap-3">
            <TabsList>
              <TabsTrigger value="library" className="gap-1.5">
                <Library className="w-3.5 h-3.5" /> Library
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-3.5 h-3.5" /> History
              </TabsTrigger>
            </TabsList>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none shrink-0">
              <Checkbox
                checked={
                  activeTab === "library"
                    ? currentFiles.length > 0 && currentFiles.every((f) => selectedLibraryIds.has(f.document_id))
                    : files.length > 0 && files.every((f) => selectedHistoryIds.has(f.document_id))
                }
                onCheckedChange={() => toggleSelectAll(activeTab, activeTab === "library" ? currentFiles : files)}
                aria-label="Select all"
              />
              Select all
            </label>
          </div>

          <TabsContent value="library" className="mt-0">
            {currentFiles.length > 0 ? (
              <>
                {renderDeleteSelectedButton("library")}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {currentFiles.map((file) => renderFileRow(file, false, "library"))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                No files on disk right now — check History for past uploads.
              </p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {renderDeleteSelectedButton("history")}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file) => renderFileRow(file, true, "history"))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <p className="text-[11px] text-muted-foreground mt-3">
        Files here are never used automatically — attach one as a source from inside a session when you want the AI to reference it.
      </p>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>This will permanently delete "{pendingDelete.file_name}" from your library and remove it from any sessions using it. This can't be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingBulkDelete} onOpenChange={(open) => !open && setPendingBulkDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingBulkDelete?.ids.length ?? 0} files?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected files from your library and remove them from any sessions using them. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmBulkDelete();
              }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Deleting..." : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
