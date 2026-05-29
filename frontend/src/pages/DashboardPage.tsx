import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box, Grid, Paper, Typography, Divider, CircularProgress,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Snackbar, Alert, IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FullCalendar from '@fullcalendar/react'
import type { CalendarApi } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import dayjs from 'dayjs'
import {
  getDailySummary, getDailySchedules, getCodeGroup,
  createSchedule, updateSchedule, deleteSchedule, getUsers,
  getHolidays,
} from '../api'
import { getAttendanceColor } from '../utils/attendance'
import { useAuthStore } from '../store/authStore'

interface Summary { attendance_type: string; attendance_name: string; count: number }
interface Detail {
  user_id: number; user_name: string
  attendance_type: string; attendance_name: string
  etc_reason?: string; schedule_id?: number
}
interface AttendanceCode { code: string; code_name: string }
interface User { id: number; user_name: string }
interface HolidayEvent { id: string; title: string; date: string; backgroundColor: string; borderColor: string; textColor: string }

interface InputDialog {
  open: boolean
  scheduleId?: number
  userId: number
  attendanceType: string
  etcReason: string
}
const DIALOG_INIT: InputDialog = { open: false, userId: 0, attendanceType: '', etcReason: '' }

export default function DashboardPage() {
  const { role, userId: myId } = useAuthStore()
  const isManager = role === 'MANAGER' || role === 'ADMIN'

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [summary, setSummary] = useState<Summary[]>([])
  const [details, setDetails] = useState<Detail[]>([])
  const [loading, setLoading] = useState(false)
  const [codes, setCodes] = useState<AttendanceCode[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [dialog, setDialog] = useState<InputDialog>(DIALOG_INIT)
  const [calYear, setCalYear] = useState(dayjs().year())
  const [holidayEvents, setHolidayEvents] = useState<HolidayEvent[]>([])
  const calendarRef = useRef<FullCalendar>(null)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  })

  const fetchData = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [s, d] = await Promise.all([getDailySummary(date), getDailySchedules(date)])
      setSummary(s.data)
      setDetails(d.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(selectedDate) }, [selectedDate, fetchData])

  useEffect(() => {
    getCodeGroup('ATTENDANCE').then((r) =>
      setCodes(r.data.details.filter((d: any) => d.use_yn === 'Y'))
    )
    if (isManager) {
      getUsers().then((r) => setUsers(r.data))
    }
  }, [isManager])

  useEffect(() => {
    getHolidays(calYear).then((r) => {
      setHolidayEvents(
        r.data.map((h: any) => {
          const color = h.color ?? (h.type === 'HOLIDAY' ? '#ef5350' : h.type === 'ANNUAL' ? '#1565c0' : '#7b1fa2')
          return {
            id: String(h.id),
            title: h.name,
            date: h.holiday_date,
            backgroundColor: color + '33',
            borderColor: color,
            textColor: color,
          }
        })
      )
    })
  }, [calYear])

  const openAdd = () => {
    setDialog({ open: true, userId: myId ?? 0, attendanceType: '', etcReason: '' })
  }

  const openEdit = (d: Detail) => {
    setDialog({
      open: true,
      scheduleId: d.schedule_id,
      userId: d.user_id,
      attendanceType: d.attendance_type,
      etcReason: d.etc_reason ?? '',
    })
  }

  const handleSave = async () => {
    try {
      if (dialog.scheduleId) {
        await updateSchedule(dialog.scheduleId, {
          attendance_type: dialog.attendanceType,
          etc_reason: dialog.etcReason || null,
        })
      } else {
        await createSchedule({
          user_id: dialog.userId,
          work_date: selectedDate,
          attendance_type: dialog.attendanceType,
          etc_reason: dialog.etcReason || null,
        })
      }
      setSnack({ open: true, msg: '저장되었습니다.', severity: 'success' })
      setDialog(DIALOG_INIT)
      fetchData(selectedDate)
    } catch (e: any) {
      setSnack({ open: true, msg: e.response?.data?.detail ?? '저장 실패', severity: 'error' })
    }
  }

  const handleDelete = async (scheduleId: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await deleteSchedule(scheduleId)
      setSnack({ open: true, msg: '삭제되었습니다.', severity: 'success' })
      fetchData(selectedDate)
    } catch (e: any) {
      setSnack({ open: true, msg: e.response?.data?.detail ?? '삭제 실패', severity: 'error' })
    }
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>메인 대시보드</Typography>
      <Grid container spacing={2}>
        {/* 달력 */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 112px)' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={koLocale}
              height="100%"
              events={[
                ...holidayEvents,
                {
                  id: '__selected__',
                  start: selectedDate,
                  display: 'background',
                  backgroundColor: '#1976d2',
                },
              ]}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              datesSet={(info) => setCalYear(dayjs(info.start).add(15, 'day').year())}
              customButtons={{
                myToday: {
                  text: '오늘',
                  click: () => {
                    const today = dayjs().format('YYYY-MM-DD')
                    calendarRef.current?.getApi().today()
                    setSelectedDate(today)
                    fetchData(today)
                  },
                },
              }}
              headerToolbar={{ left: 'prev,next myToday', center: 'title', right: '' }}
              eventDisplay="block"
              dayMaxEvents={3}
            />
            <style>{`
              .fc-day-sat .fc-daygrid-day-number { color: #1565c0 !important; font-weight: 700; }
              .fc-day-sun .fc-daygrid-day-number { color: #c62828 !important; font-weight: 700; }
              .fc-day-sat { background: #f8f9ff; }
              .fc-day-sun { background: #fff8f8; }
              .fc-bg-event { opacity: 0.35 !important; }
              .fc-event:not(.fc-bg-event) { font-size: 11px !important; padding: 1px 4px !important; }
              .fc-button-primary { background-color: #1976d2 !important; border-color: #1976d2 !important; }
              .fc-button-primary:hover { background-color: #1565c0 !important; }
            `}</style>
          </Paper>
        </Grid>

        {/* 오른쪽 패널 - 근태 집계 + 인원 통합 */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 112px)', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
                {dayjs(selectedDate).format('YYYY년 MM월 DD일')} 근태 현황
              </Typography>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd}>
                근태 입력
              </Button>
            </Box>
            <Divider sx={{ mb: 1.5 }} />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {codes.map((c) => {
                  const count = summary.find((s) => s.attendance_type === c.code)?.count ?? 0
                  const members = details.filter((d) => d.attendance_type === c.code)
                  const color = getAttendanceColor(c.code)
                  const hasMembers = members.length > 0

                  return (
                    <Box
                      key={c.code}
                      sx={{
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: hasMembers ? color.text + '55' : '#e8e8e8',
                        borderLeft: '5px solid',
                        borderLeftColor: hasMembers ? color.text : '#ddd',
                        bgcolor: hasMembers ? color.bg : '#fafafa',
                        overflow: 'hidden',
                      }}
                    >
                      {/* 근태종류명 + 인원수 + 이름 인라인 */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 1.2, py: 0.7, gap: 1 }}>
                        {/* 왼쪽: 종류명 + 인원수 */}
                        <Box sx={{ minWidth: 80, flexShrink: 0 }}>
                          <Typography
                            fontSize={14}
                            fontWeight={700}
                            color={hasMembers ? color.text : 'text.disabled'}
                            lineHeight={1.3}
                          >
                            {c.code_name}
                          </Typography>
                          <Typography
                            fontSize={13}
                            fontWeight={600}
                            color={hasMembers ? color.text : 'text.disabled'}
                          >
                            {count}명
                          </Typography>
                        </Box>

                        {/* 오른쪽: 이름 태그들 (가로 wrap) */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pt: 0.2, flexGrow: 1 }}>
                          {members.map((d) => {
                            const canEdit = isManager || d.user_id === myId
                            return (
                              <Box
                                key={d.user_id}
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.3,
                                  px: 1,
                                  py: 0.3,
                                  borderRadius: 1,
                                  bgcolor: 'white',
                                  border: '1px solid',
                                  borderColor: color.text + '44',
                                  cursor: canEdit ? 'pointer' : 'default',
                                  '&:hover': canEdit ? { bgcolor: color.bg, borderColor: color.text } : {},
                                }}
                                onClick={() => canEdit && openEdit(d)}
                              >
                                <Typography fontSize={14} color={color.text} fontWeight={500}>
                                  {d.user_name}
                                </Typography>
                                {d.etc_reason && (
                                  <Typography fontSize={12} color="text.secondary">
                                    ({d.etc_reason})
                                  </Typography>
                                )}
                                {canEdit && d.schedule_id && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(d.schedule_id!) }}
                                    sx={{ p: 0.1, ml: 0.2 }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                )}
                              </Box>
                            )
                          })}
                        </Box>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 근태 입력/수정 다이얼로그 */}
      <Dialog open={dialog.open} onClose={() => setDialog(DIALOG_INIT)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dayjs(selectedDate).format('MM월 DD일')} 근태 {dialog.scheduleId ? '수정' : '입력'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {isManager && !dialog.scheduleId && (
            <FormControl size="small" fullWidth>
              <InputLabel>대상자</InputLabel>
              <Select
                value={dialog.userId}
                label="대상자"
                onChange={(e) => setDialog((d) => ({ ...d, userId: Number(e.target.value) }))}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.user_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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
          <Button onClick={() => setDialog(DIALOG_INIT)}>취소</Button>
          <Button variant="contained" onClick={handleSave} disabled={!dialog.attendanceType || !dialog.userId}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
