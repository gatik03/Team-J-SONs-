import { DocumentType } from '@prisma/client';
import { prisma } from '../../common/prisma';
import { newId } from '../../common/ids';
import { toApplicationDocument } from '../application/service';
import type { ApplicationDocumentDto } from '../application/schemas';

export async function createDocument(
  applicationId: string,
  documentType: DocumentType,
  fileName: string,
  storedPath: string,
  contentType: string,
  sizeBytes: number
): Promise<ApplicationDocumentDto> {
  const documentId = newId('DOC');
  const doc = await prisma.applicationDocument.create({
    data: {
      documentId,
      applicationId,
      documentType,
      fileName,
      storedPath,
      contentType,
      sizeBytes,
    },
  });
  return toApplicationDocument(doc);
}
