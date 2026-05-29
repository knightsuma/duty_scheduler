export const ATTENDANCE_COLORS: Record<string, { bg: string; text: string; short: string }> = {
  ALWAYS:   { bg: '#e3f2fd', text: '#1565c0', short: '상시' },
  DAY:      { bg: '#e8f5e9', text: '#2e7d32', short: '주'   },
  DUTY:     { bg: '#e3f0ff', text: '#1a237e', short: '당직' },
  LEAVE:    { bg: '#f3e5f5', text: '#6a1b9a', short: '퇴근' },
  ANNUAL:   { bg: '#ffebee', text: '#c62828', short: '연차' },
  WORKER:   { bg: '#fff3e0', text: '#e65100', short: '작업' },
  ALT_REST: { bg: '#f5f5f5', text: '#424242', short: '대체' },
  EARLY:    { bg: '#fce4ec', text: '#880e4f', short: '5시' },
  ETC:      { bg: '#fafafa', text: '#757575', short: '기타' },
}

export function getAttendanceColor(code: string) {
  return ATTENDANCE_COLORS[code] ?? { bg: '#fafafa', text: '#333', short: code }
}
