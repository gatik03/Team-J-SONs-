import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';
import type { ApplicationDocument, DocumentType } from '../../api/types';
import { useUploadDocument } from '../../api/hooks/documents';
import { formatDateTime } from '../../lib/formatDate';

export interface FileDropzoneProps {
  applicationId: string;
  documentType: DocumentType;
  label: string;
  existing?: ApplicationDocument;
  onUploaded?: (doc: ApplicationDocument) => void;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function FileDropzone({
  applicationId,
  documentType,
  label,
  existing,
  onUploaded,
}: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadDocument(applicationId);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF, PNG, or JPG document.');
      return;
    }

    if (file.size > MAX_BYTES) {
      setError('File is too large. Maximum allowed size is 5 MB.');
      return;
    }

    uploadMutation.mutate(
      { documentType, file },
      {
        onSuccess: (savedDoc) => {
          if (onUploaded) onUploaded(savedDoc);
        },
        onError: (err) => {
          setError(err.message || 'Failed to upload document');
        },
      }
    );
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-fg">{label}</span>

      {existing ? (
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-surface-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-success-soft text-success">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">{existing.fileName}</p>
              <p className="text-xs text-muted">
                {(existing.sizeBytes / 1024).toFixed(1)} KB · Uploaded{' '}
                {formatDateTime(existing.uploadedAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="text-xs font-semibold text-primary hover:underline px-2.5 py-1.5 rounded focus-ring"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Replace'}
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary bg-primary-soft/50'
              : 'border-border hover:border-primary/50 hover:bg-surface-2'
          }`}
        >
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted">Uploading document...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <UploadCloud className="w-8 h-8 text-muted" />
              <p className="text-xs font-medium text-fg">
                Drag and drop or <span className="text-primary underline">browse</span>
              </p>
              <p className="text-[11px] text-muted">Supported: PDF, JPG, PNG (Max 5 MB)</p>
            </div>
          )}
        </div>
      )}

      {!existing && !uploadMutation.isPending && (
        <div className="flex items-center gap-1.5 text-xs text-warn">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Not uploaded yet (optional for submission, required for final approval)</span>
        </div>
      )}

      {error && <p className="text-xs text-danger font-medium">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        aria-label={`Upload ${label}`}
      />
    </div>
  );
}
