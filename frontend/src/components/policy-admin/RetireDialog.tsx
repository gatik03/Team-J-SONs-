import { useEffect, useRef, useState } from 'react';
import type { PolicyVersion } from '../../api/types';
import { useRetirePolicy } from '../../api/hooks/policyAdmin';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

export interface RetireDialogProps {
  version: PolicyVersion;
  versions: PolicyVersion[];
  open: boolean;
  onClose: () => void;
  onRetired: (v: PolicyVersion) => void;
}

const MIN_RETIRE_REASON = 5;

export function RetireDialog({
  version,
  versions,
  open,
  onClose,
  onRetired,
}: RetireDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const retireMutation = useRetirePolicy();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setReason('');
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  const activeRow = versions.find((v) => v.servingState === 'ACTIVE');

  // Find superseded row with highest effective date
  const supersededRows = versions
    .filter((v) => v.servingState === 'SUPERSEDED')
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const prevSuperseded = supersededRows[0];

  let consequenceText = '';
  if (version.servingState === 'ACTIVE') {
    if (prevSuperseded) {
      consequenceText = `v${prevSuperseded.version} becomes active again.`;
    } else {
      consequenceText =
        'No version of this policy will be in force; the assistant stops citing it.';
    }
  } else if (version.servingState === 'SCHEDULED') {
    consequenceText = `It will not start serving. ${
      activeRow ? `v${activeRow.version} stays active.` : ''
    }`;
  } else if (version.servingState === 'SUPERSEDED') {
    consequenceText = 'The active version does not change.';
  }

  const trimmed = reason.trim();
  const isValid = trimmed.length >= MIN_RETIRE_REASON;

  const handleConfirm = () => {
    if (!isValid) return;

    retireMutation.mutate(
      { documentId: version.documentId, reason: trimmed },
      {
        onSuccess: (retiredVersion) => {
          onRetired(retiredVersion);
          onClose();
        },
      }
    );
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-6 rounded-lg shadow-pop bg-surface border border-border text-fg max-w-md w-full backdrop:bg-black/50"
    >
      <div className="space-y-4">
        <h3 className="text-h3 font-bold text-fg">Retire v{version.version}?</h3>

        {retireMutation.error && <ErrorAlert error={retireMutation.error} />}

        {consequenceText && (
          <p className="text-xs font-semibold text-warn bg-warn-soft p-2.5 rounded-md">
            {consequenceText}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="retire-reason" className="block text-xs font-medium text-fg">
            Reason (required, at least 5 characters)
          </label>
          <textarea
            id="retire-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Obsolete rates replaced by updated circular."
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-xs resize-none"
            required
          />
          <div className="text-[11px] text-muted text-right">
            {trimmed.length}/{MIN_RETIRE_REASON} characters
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={retireMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!isValid || retireMutation.isPending}
            loading={retireMutation.isPending}
            onClick={handleConfirm}
          >
            Retire v{version.version}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
