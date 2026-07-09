import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { listLibrary, getStorageUsage, type LibraryFile } from "@/lib/sessionsApi";
import { HardDrive, UploadCloud } from "lucide-react";

const statusVariant = (status: string) => {
  if (status === "processed") return "success" as const;
  if (status === "failed") return "warning" as const;
  return "info" as const;
};

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export const StorageLibraryCard = () => {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [usage, setUsage] = useState<{ usedBytes: number; capBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listLibrary(), getStorageUsage()])
      .then(([libraryFiles, storageUsage]) => {
        if (cancelled) return;
        setFiles(libraryFiles);
        setUsage(storageUsage);
      })
      .catch(() => { /* silent — falls back to empty state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const usedPct = usage ? Math.min(100, Math.round((usage.usedBytes / usage.capBytes) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <HardDrive className="w-4 h-4" />
        </div>
        <h2 className="font-bold text-sm">Storage &amp; Library</h2>
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
          description="Files you upload in the AI Tutor stay here permanently — reuse any of them as a source in any session."
        />
      )}

      {files.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {files.map((file) => (
            <div key={file.document_id} className="flex items-center justify-between gap-2 rounded-xl bg-secondary/40 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatMb(file.size_bytes)} MB</p>
              </div>
              <StatusChip label={file.processing_status} variant={statusVariant(file.processing_status)} />
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">
        Files here are never used automatically — attach one as a source from inside a session when you want the AI to reference it.
      </p>
    </div>
  );
};
