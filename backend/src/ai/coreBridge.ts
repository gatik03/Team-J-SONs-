// The ONLY file in src/ai that imports S1 core code or the stub (S2 prompt step S.2).
// Before S1's core services are merged it re-exports the in-memory stub; after the merge, swap the body for wrappers over ../core/**.
export { getApplication, transition, listDocuments, listProducts, getProduct, getCustomer,
         calculateEmi, obligationRatioPct } from './stub/core';
export type { AiProduct, AiCustomer, AiDocument, AiApplication, ApplicationStatus, LoanType,
              CustomerSegment, DocumentType } from './stub/core';
