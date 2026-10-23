import {afterEach,expect,it,vi} from 'vitest';
import {todayIso} from './formatDate';
afterEach(()=>vi.useRealTimers());
it('uses the bank calendar in Asia/Kolkata for policy dates',()=>{
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T19:00:00Z'));
  expect(todayIso()).toBe('2026-10-23');
});
