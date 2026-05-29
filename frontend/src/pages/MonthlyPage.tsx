import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Box, Typography, Paper,
  IconButton, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, Snackbar,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DownloadIcon from '@mui/icons-material/Download'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellClickedEvent } from 'ag-grid-community'
import { getMonthlySchedules, getCodeGroup, createSchedule, updateSchedule, deleteSchedule } from '../api'
import { getAttendanceColor, ATTENDANCE_COLORS } from '../utils/attendance'
import { useAuthStore } from '../store/authStore'

interface RowData {
  user_id: number
  user_name: string
  work_type?: string
  schedules: Record<string, { attendance_type: string; etc_reason?: string; schedule_id?: number }>
  [key: string]: any
}

interface AttendanceCode { code: string; code_name: string }

interface EditDialog {
  open: boolean
  userId: number
  userName: string
  workDate: string
  scheduleId?: number
  attendanceType: string
  etcReason: string
}

const DIALOG_INIT: EditDialog = {
  open: false, userId: 0, userName: '', workDate: '',
  scheduleId: undefined, attendanceType: '', etcReason: '',
}

function AttendanceCell({ value }: { value?: { attendance_type: string; etc_reason?: string } }) {
  if (!value) return <span style={{ color: '#bbb', fontSize: 12 }}>-</span>
  const color = getAttendanceColor(value.attendance_type)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 4,
        background: color.bg,
        color: color.text,
        fontWeight: 600,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {color.short}
    </span>
  )
}

// hex #rrggbb → XLSX ARGB (FF + rrggbb)
function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase()
}

export default function MonthlyPage() {
  const { role, userId } = useAuthStore()
  const [current, setCurrent] = useState(dayjs())
  const [rows, setRows] = useState<RowData[]>([])
  const [codes, setCodes] = useState<AttendanceCode[]>([])
  const [dialog, setDialog] = useState<EditDialog>(DIALOG_INIT)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  })
  const gridRef = useRef<AgGridReact>(null)

  const year = current.year()
  const month = current.month() + 1
  const daysInMonth = current.daysInMonth()
  const isManager = role === 'MANAGER' || role === 'ADMIN'

  const fetchSchedules = useCallback(async () => {
    const res = await getMonthlySchedules(year, month)
    setRows(res.data)
  }, [year, month])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  useEffect(() => {
    getCodeGroup('ATTENDANCE').then((res) => setCodes(res.data.details.filter((d: any) => d.use_yn === 'Y')))
  }, [])

  // AG-Grid 컬럼 정의
  const colDefs = useMemo<ColDef[]>(() => {
    const fixed: ColDef[] = [
      {
        headerName: '이름',
        field: 'user_name',
        width: 90,
        pinned: 'left',
        cellStyle: { fontWeight: 600 },
      },
    ]
    const dayCols: ColDef[] = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const weekday = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).day()
      const isSun = weekday === 0
      const isSat = weekday === 6
      return {
        headerName: String(day),
        field: `day_${day}`,
        width: 52,
        cellRenderer: AttendanceCell,
        headerClass: isSun ? 'header-sun' : isSat ? 'header-sat' : '',
        cellStyle: { padding: '2px 4px', cursor: 'pointer' },
        onCellClicked: (e: CellClickedEvent) => handleCellClick(e, day),
      }
    })
    return [...fixed, ...dayCols]
  }, [daysInMonth, year, month])

  const rowData = useMemo(() =>
    rows.map((r) => {
      const flat: Record<string, any> = { user_id: r.user_id, user_name: r.user_name }
      for (let d = 1; d <= daysInMonth; d++) {
        flat[`day_${d}`] = r.schedules[d] ?? null
      }
      return flat
    }),
  [rows, daysInMonth])

  function handleCellClick(e: CellClickedEvent, day: number) {
    const row = e.data as Record<string, any>
    if (!isManager && row.user_id !== userId) return
    const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const cell = row[`day_${day}`]
    setDialog({
      open: true,
      userId: row.user_id,
      userName: row.user_name,
      workDate,
      scheduleId: cell?.schedule_id,
      attendanceType: cell?.attendance_type ?? '',
      etcReason: cell?.etc_reason ?? '',
    })
  }

  async function handleSave() {
    const { userId: uid, workDate, attendanceType, etcReason, scheduleId } = dialog
    if (!attendanceType) return
    try {
      if (scheduleId) {
        await updateSchedule(scheduleId, { attendance_type: attendanceType, etc_reason: etcReason || null })
      } else {
        await createSchedule({ user_id: uid, work_date: workDate, attendance_type: attendanceType, etc_reason: etcReason || null })
      }
      setSnack({ open: true, msg: '저장되었습니다.', severity: 'success' })
      setDialog(DIALOG_INIT)
      fetchSchedules()
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.detail ?? '저장 실패', severity: 'error' })
    }
  }

  async function handleDelete() {
    if (!dialog.scheduleId) return
    try {
      await deleteSchedule(dialog.scheduleId)
      setSnack({ open: true, msg: '삭제되었습니다.', severity: 'success' })
      setDialog(DIALOG_INIT)
      fetchSchedules()
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.detail ?? '삭제 실패', severity: 'error' })
    }
  }

  function handleExcelDownload() {
    const monthStr = String(month).padStart(2, '0')
    const title = `${year}년 ${month}월 근무표`

    // 헤더 행: 이름 + 1일~N일 (요일 포함)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const wd = dayjs(`${year}-${monthStr}-${String(d).padStart(2, '0')}`).day()
      return `${d}\n${weekdays[wd]}`
    })
    const headerRow = ['이름', ...dayHeaders]

    // 데이터 행
    const dataRows = rows.map((r) => {
      const cells: string[] = [r.user_name]
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = r.schedules[d]
        if (!cell) {
          cells.push('')
        } else {
          const color = getAttendanceColor(cell.attendance_type)
          cells.push(color.short + (cell.etc_reason ? `(${cell.etc_reason})` : ''))
        }
      }
      return cells
    })

    const wsData = [headerRow, ...dataRows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 10 },                                         // 이름
      ...Array.from({ length: daysInMonth }, () => ({ wch: 5 })), // 날짜 열
    ]

    // 헤더 행 높이
    ws['!rows'] = [{ hpt: 30 }]

    // 셀 스타일 적용 (xlsx는 기본적으로 스타일 미지원, write 옵션으로 처리)
    // 데이터 셀 배경색: 근태종류별 색상 적용
    rows.forEach((r, rowIdx) => {
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = r.schedules[d]
        if (!cell) continue

        const colIdx = d  // 0=이름, 1~N=날짜
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx })
        const color = ATTENDANCE_COLORS[cell.attendance_type]
        if (color && ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: hexToArgb(color.bg) } },
            font: { color: { rgb: hexToArgb(color.text) }, bold: true, sz: 9 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { rgb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { rgb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { rgb: 'FFE0E0E0' } },
            },
          }
        }
      }

      // 이름 셀 스타일
      const nameCellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 0 })
      if (ws[nameCellRef]) {
        ws[nameCellRef].s = {
          font: { bold: true, sz: 10 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { rgb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
          },
        }
      }
    })

    // 헤더 스타일 + 토/일 색상
    headerRow.forEach((_, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx })
      if (!ws[cellRef]) return
      let bgColor = 'FF37474F'  // 기본 헤더 어두운 색
      let fontColor = 'FFFFFFFF'
      if (colIdx > 0) {
        const d = colIdx
        const wd = dayjs(`${year}-${monthStr}-${String(d).padStart(2, '0')}`).day()
        if (wd === 0) { bgColor = 'FFFFEBEE'; fontColor = 'FFC62828' }      // 일
        else if (wd === 6) { bgColor = 'FFE3F2FD'; fontColor = 'FF1565C0' } // 토
        else { bgColor = 'FFF5F5F5'; fontColor = 'FF333333' }
      }
      ws[cellRef].s = {
        fill: { fgColor: { rgb: bgColor } },
        font: { bold: true, sz: colIdx === 0 ? 11 : 9, color: { rgb: fontColor } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'medium', color: { rgb: 'FF90A4AE' } },
          bottom: { style: 'medium', color: { rgb: 'FF90A4AE' } },
          left: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
        },
      }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${year}년 ${month}월`)
    XLSX.writeFile(wb, `근무표_${year}년${monthStr}월.xlsx`, { cellStyles: true })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        <Typography variant="h6" fontWeight={700}>월간 근무 현황</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          (셀 클릭 시 근태 입력/수정)
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={() => setCurrent((c) => c.subtract(1, 'month'))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography fontWeight={600} minWidth={90} textAlign="center">
          {current.format('YYYY년 MM월')}
        </Typography>
        <IconButton size="small" onClick={() => setCurrent((c) => c.add(1, 'month'))}>
          <ChevronRightIcon />
        </IconButton>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleExcelDownload}
          sx={{ ml: 1 }}
        >
          엑셀 다운로드
        </Button>
      </Box>

      <Paper>
        <div
          className="ag-theme-alpine"
          style={{ height: 'calc(100vh - 160px)', width: '100%' }}
        >
          <style>{`
            .ag-theme-alpine .header-sun .ag-header-cell-label { color: #c62828; }
            .ag-theme-alpine .header-sat .ag-header-cell-label { color: #1565c0; }
            .ag-theme-alpine .ag-cell { display: flex; align-items: center; }
          `}</style>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={{ resizable: true, sortable: false }}
            rowHeight={36}
            headerHeight={36}
          />
        </div>
      </Paper>

      {/* 수정 다이얼로그 */}
      <Dialog open={dialog.open} onClose={() => setDialog(DIALOG_INIT)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialog.userName} — {dialog.workDate}
          {dialog.scheduleId ? ' (수정)' : ' (입력)'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <FormControl size="small" fullWidth required>
            <InputLabel>근태종류</InputLabel>
            <Select
              value={dialog.attendanceType}
              label="근태종류"
              onChange={(e) => setDialog((d) => ({ ...d, attendanceType: e.target.value }))}
            >
              {codes.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.code_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {dialog.attendanceType === 'ETC' && (
            <TextField
              label="기타 사유"
              size="small"
              value={dialog.etcReason}
              onChange={(e) => setDialog((d) => ({ ...d, etcReason: e.target.value }))}
              multiline
              rows={2}
            />
          )}
        </DialogContent>
        <DialogActions>
          {dialog.scheduleId && (
            <Button color="error" onClick={handleDelete}>삭제</Button>
          )}
          <Button onClick={() => setDialog(DIALOG_INIT)}>취소</Button>
          <Button variant="contained" onClick={handleSave} disabled={!dialog.attendanceType}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
