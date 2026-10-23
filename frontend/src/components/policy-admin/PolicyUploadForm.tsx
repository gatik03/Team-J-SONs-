import React, { useRef, useState, useEffect } from 'react';
import type {
  Audience,
  CustomerSegmentOrAll,
  KnowledgeDocumentType,
  LoanTypeOrAll,
  PolicyLibraryItem,
  PolicyVersion,
} from '../../api/types';
import { useUploadPolicyDraft } from '../../api/hooks/policyAdmin';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { DOCUMENT_TYPE_LABEL } from '../knowledge/KnowledgeTable';
import { UploadCloud, FileCheck } from 'lucide-react';
import { ApiError } from '../../api/client';
import { todayIso } from '../../lib/formatDate';

export interface PolicyUploadFormProps {
  library: PolicyLibraryItem[];
  defaultDocumentKey?: string;
  onCreated: (v: PolicyVersion) => void;
  onCancel: () => void;
}

const DOCUMENT_KEY_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
const MIN_CHANGE_NOTE = 5;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function PolicyUploadForm({
  library,
  defaultDocumentKey = '',
  onCreated,
  onCancel,
}: PolicyUploadFormProps) {
  const [documentKey, setDocumentKey] = useState(defaultDocumentKey);
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('2026.4');
  const [effectiveDate, setEffectiveDate] = useState(todayIso);
  const [loanType, setLoanType] = useState<LoanTypeOrAll>('ALL');
  const [documentType, setDocumentType] = useState<KnowledgeDocumentType>('TERMS_AND_CONDITIONS');
  const [audience, setAudience] = useState<Audience>('CUSTOMER');
  const [customerSegment, setCustomerSegment] = useState<CustomerSegmentOrAll>('ALL');
  const [changeNote, setChangeNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadPolicyDraft();

  // Prefill when documentKey matches an existing library item
  useEffect(() => {
    const existing = library.find((item) => item.documentKey === documentKey);
    if (existing) {
      if (!title) setTitle(existing.title);
      setDocumentType(existing.documentType);
      setAudience(existing.audience);
    }
  }, [documentKey, library]);

  const matchedItem = library.find((item) => item.documentKey === documentKey);

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > MAX_BYTES) {
      setFieldErrors((prev) => ({ ...prev, file: 'File must be under 5 MB' }));
      return;
    }
    setSelectedFile(file);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    const cleanKey = documentKey.trim().toUpperCase();
    if (!cleanKey) {
      errors.documentKey = 'Policy key is required';
    } else if (!DOCUMENT_KEY_PATTERN.test(cleanKey)) {
      errors.documentKey =
        'Use UPPERCASE letters, digits and single hyphens, e.g. VEHICLE-TNC';
    }

    if (!title.trim()) errors.title = 'Title is required';
    if (!version.trim()) errors.version = 'Version is required';
    if (!effectiveDate) errors.effectiveDate = 'Effective date is required';
    if (!selectedFile) errors.file = 'Please upload a policy document file';
    if (changeNote.trim().length < MIN_CHANGE_NOTE) {
      errors.changeNote = `Change note must be at least ${MIN_CHANGE_NOTE} characters`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    uploadMutation.mutate(
      {
        file: selectedFile!,
        documentKey: cleanKey,
        title: title.trim(),
        version: version.trim(),
        effectiveDate,
        loanType,
        documentType,
        audience,
        customerSegment: customerSegment === 'ALL' ? undefined : customerSegment,
        changeNote: changeNote.trim(),
      },
      {
        onSuccess: (newVersion) => {
          onCreated(newVersion);
        },
        onError: (err) => {
          setGeneralError(err);
          if (err instanceof ApiError && err.body.details) {
            const mapped: Record<string, string> = {};
            for (const d of err.body.details) {
              if (d.field && d.issue) mapped[d.field] = d.issue;
            }
            setFieldErrors(mapped);
          }
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {Boolean(generalError) && <ErrorAlert error={generalError} />}

      {/* Policy Key with Datalist */}
      <Field
        id="policy-key"
        label="Policy key"
        error={fieldErrors.documentKey}
        hint={
          matchedItem
            ? `Adds a new version to ${matchedItem.title} (active v${matchedItem.activeVersion ?? 'none'})`
            : 'Creates a new policy key (use UPPERCASE and hyphens, e.g. VEHICLE-TNC)'
        }
        required
      >
        <input
          list="policy-keys"
          type="text"
          value={documentKey}
          onChange={(e) => setDocumentKey(e.target.value.toUpperCase())}
          placeholder="e.g. VEHICLE-TNC"
          required
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm font-mono"
        />
      </Field>

      <datalist id="policy-keys">
        {library.map((item) => (
          <option key={item.documentKey} value={item.documentKey}>
            {item.title}
          </option>
        ))}
      </datalist>

      {/* Title */}
      <Field id="policy-title" label="Policy title" error={fieldErrors.title} required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Vehicle Loan Terms and Conditions"
          required
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Version */}
        <Field id="policy-version" label="Version" error={fieldErrors.version} required>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="2026.4"
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm font-mono"
          />
        </Field>

        {/* Effective Date */}
        <Field
          id="policy-effective-date"
          label="Effective date"
          error={fieldErrors.effectiveDate}
          hint="A future date publishes as SCHEDULED: it starts serving automatically on that date."
          required
        >
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Loan Type */}
        <Field id="policy-loan-type" label="Loan type" required>
          <select
            value={loanType}
            onChange={(e) => setLoanType(e.target.value as LoanTypeOrAll)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
          >
            <option value="ALL">All loan types</option>
            <option value="PERSONAL">Personal</option>
            <option value="HOME">Home</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="EDUCATION">Education</option>
          </select>
        </Field>

        {/* Document Type */}
        <Field id="policy-doc-type" label="Document type" required>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as KnowledgeDocumentType)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
          >
            {Object.entries(DOCUMENT_TYPE_LABEL).map(([val, lbl]) => (
              <option key={val} value={val}>
                {lbl}
              </option>
            ))}
          </select>
        </Field>

        {/* Audience */}
        <Field id="policy-audience" label="Audience" required>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
          >
            <option value="CUSTOMER">Customer (Public)</option>
            <option value="INTERNAL">Internal Staff Only</option>
          </select>
        </Field>
      </div>

      {/* Customer Segment */}
      <Field id="policy-segment" label="Customer segment (optional)">
        <select
          value={customerSegment}
          onChange={(e) => setCustomerSegment(e.target.value as CustomerSegmentOrAll)}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
        >
          <option value="ALL">All customer segments</option>
          <option value="SALARIED">Salaried</option>
          <option value="SELF_EMPLOYED">Self-employed</option>
          <option value="STUDENT">Student</option>
        </select>
      </Field>

      {/* Change Note */}
      <Field
        id="policy-change-note"
        label="Change note (what changed)"
        error={fieldErrors.changeNote}
        required
      >
        <textarea
          rows={3}
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="e.g. Foreclosure lock-in reduced from 6 to 3 EMIs"
          required
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm resize-none"
        />
      </Field>

      {/* File Dropzone */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-fg">
          Policy file document <span className="text-danger">*</span>
        </label>
        <button
          type="button"
          aria-label="Choose policy document file"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); handleFileChange(event.dataTransfer.files); }}
          className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-surface-2 rounded-lg p-5 text-center cursor-pointer transition-colors focus-ring"
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-success">
              <FileCheck className="w-5 h-5" />
              <span className="font-semibold text-xs text-fg">{selectedFile.name}</span>
              <span className="text-muted text-xs">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-1 text-muted">
              <UploadCloud className="w-8 h-8 text-muted" />
              <p className="text-xs font-medium text-fg">
                Drag and drop or <span className="text-primary underline">browse</span>
              </p>
              <p className="text-[11px]">Supported formats: .pdf, .md, .csv, .json (Max 5 MB)</p>
            </div>
          )}
        </button>
        {fieldErrors.file && <p className="text-xs text-danger font-medium">{fieldErrors.file}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.csv,.json"
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
          aria-label="Upload policy document file"
        />
      </div>

      <div className="pt-3 border-t border-border flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={uploadMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={uploadMutation.isPending}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading draft...' : 'Upload as draft'}
        </Button>
      </div>
    </form>
  );
}
