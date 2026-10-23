import { USE_MOCKS } from '../../api/client';

export function MockBadge() {
  if (!USE_MOCKS) return null;
  return (
    <div
      role="status"
      className="fixed bottom-3 left-3 z-50 bg-warn text-white text-xs font-semibold rounded-full px-3 py-1 shadow-card"
    >
      MOCK DATA
    </div>
  );
}
