import { useEffect, useRef } from 'react';
import type { PolicyVersion } from '../../api/types';
import { usePublishPolicy } from '../../api/hooks/policyAdmin';
import { formatDate, todayIso } from '../../lib/formatDate';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

export interface PublishDialogProps {
  version: PolicyVersion;
  versions: PolicyVersion[];
  open: boolean;
  onClose: () => void;
  onPublished: (v: PolicyVersion) => void;
}

export function PublishDialog({
  version,
  versions,
  open,
  onClose,
  onPublished,
}: PublishDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const publishMutation = usePublishPolicy();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
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
  const isFuture = version.effectiveDate > todayIso();

  const handleConfirm = () => {
    publishMutation.mutate(version.documentId, {
      onSuccess: (publishedVersion) => {
        onPublished(publishedVersion);
        onClose();
      },
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-6 rounded-lg shadow-pop bg-surface border border-border text-fg max-w-md w-full backdrop:bg-black/50"
    >
      <div className="space-y-4">
        <h3 className="text-h3 font-bold text-fg">Publish v{version.version}?</h3>

        {publishMutation.error && <ErrorAlert error={publishMutation.error} />}

        <div className="text-xs text-muted space-y-2">
          {isFuture ? (
            <p>
              v{version.version} will be <span className="font-semibold text-warn">SCHEDULED</span>.
              It starts serving automatically on {formatDate(version.effectiveDate)}.{' '}
              {activeRow ? `v${activeRow.version} stays active until then.` : ''}
            </p>
          ) : (
            <p>
              v{version.version} becomes <span className="font-semibold text-success">ACTIVE</span>{' '}
              now (effective {formatDate(version.effectiveDate)}){' '}
              {activeRow
                ? `and replaces v${activeRow.version} in the policy assistant.`
                : 'and becomes the first version in force.'}
            </p>
          )}

          <p className="font-medium text-fg pt-1">
            Published versions cannot be edited; a change requires uploading a new version.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={publishMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={publishMutation.isPending}
          >
            Publish v{version.version}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
