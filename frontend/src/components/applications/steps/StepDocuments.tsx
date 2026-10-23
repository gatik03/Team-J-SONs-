import { useDocuments } from '../../../api/hooks/documents';
import { FileDropzone } from '../FileDropzone';

export interface StepDocumentsProps {
  applicationId: string;
}

export function StepDocuments({ applicationId }: StepDocumentsProps) {
  const { data: docs } = useDocuments(applicationId);

  const identityDoc = docs?.find((d) => d.documentType === 'IDENTITY');
  const addressDoc = docs?.find((d) => d.documentType === 'ADDRESS');
  const incomeDoc = docs?.find((d) => d.documentType === 'INCOME');

  return (
    <div className="space-y-6">
      <div className="p-3 bg-surface-2 rounded-md text-xs text-muted">
        Upload supporting documents for credit assessment and KYC verification. Applications can be saved and submitted even if certain documents are pending.
      </div>

      <div className="space-y-4">
        <FileDropzone
          applicationId={applicationId}
          documentType="IDENTITY"
          label="Identity Proof (PAN Card / Passport)"
          existing={identityDoc}
        />

        <FileDropzone
          applicationId={applicationId}
          documentType="ADDRESS"
          label="Address Proof (Aadhaar / Utility Bill / Rental Agreement)"
          existing={addressDoc}
        />

        <FileDropzone
          applicationId={applicationId}
          documentType="INCOME"
          label="Income Proof (Salary Slips / Bank Statement / ITR)"
          existing={incomeDoc}
        />
      </div>
    </div>
  );
}
