import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Button, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Chip, Snackbar, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import dayjs from 'dayjs'
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../api'

interface Holiday {
  id: number
  holiday_date: string
  name: string
  type: string
  color?: string
}

const TYPE_OPTIONS = [
  { value: 'HOLIDAY', label: '공휴일', defaultColor: '#ef5350' },
  { value: 'EVENT',   label: '회사행사', defaultColor: '#7b1fa2' },
  { value: 'ANNUAL',  label: '단체연차', defaultColor: '#1565c0' },
]

const PRESET_COLORS = [
  '#ef5350', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#009688', '#4caf50',
  '#ff9800', '#795548', '#607d8b', '#f06292',
]

function getTypeLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type
}
function getTypeColor(type: string, color?: string) {
  return color ?? TYPE_OPTIONS.find((t) => t.value === type)?.defaultColor ?? '#888'
}

interface FormState { holiday_date: string; name: string; type: string; color: string }
const FORM_INIT: FormState = { holiday_date: '', name: '', type: 'HOLIDAY', color: '' }

export default function HolidayPage() {
  const [year, setYear] = useState(dayjs().year())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Holiday | null>(null)
  const [form, setForm] = useState<FormState>(FORM_INIT)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  })

  const fetchHolidays = () =>
    getHolidays(year).then((r) => setHolidays(r.data))

  useEffect(() => { fetchHolidays() }, [year])

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity })

  const openCreate = () => {
    setForm({ ...FORM_INIT, holiday_date: `${year}-01-01` })
    setDialog('create')
  }

  const openEdit = (h: Holiday) => {
    setSelected(h)
    setForm({ holiday_date: h.holiday_date, name: h.name, type: h.type, color: h.color ?? '' })
    setDialog('edit')
  }

  const handleSave = async () => {
    const payload = { ...form, color: form.color || null }
    try {
      if (dialog === 'create') {
        await createHoliday(payload)
        showSnack('등록되었습니다.')
      } else if (selected) {
        await updateHoliday(selected.id, payload)
        showSnack('수정되었습니다.')
      }
      setDialog(null)
      fetchHolidays()
    } catch (e: any) {
      showSnack(e.response?.data?.detail ?? '오류 발생', 'error')
    }
  }

  const handleDelete = async (h: Holiday) => {
    if (!confirm(`"${h.name}" 을(를) 삭제하시겠습니까?`)) return
    try {
      await deleteHoliday(h.id)
      showSnack('삭제되었습니다.')
      fetchHolidays()
    } catch (e: any) {
      showSnack(e.response?.data?.detail ?? '오류 발생', 'error')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h6" fontWeight={700}>휴일 / 행사 관리</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={() => setYear((y) => y - 1)}><ChevronLeftIcon /></IconButton>
        <Typography fontWeight={600} minWidth={60} textAlign="center">{year}년</Typography>
        <IconButton size="small" onClick={() => setYear((y) => y + 1)}><ChevronRightIcon /></IconButton>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate} sx={{ ml: 1 }}>
          추가
        </Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              {['날짜', '이름', '구분', '색상', '관리'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  등록된 휴일/행사가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => {
                const color = getTypeColor(h.type, h.color)
                return (
                  <TableRow key={h.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {dayjs(h.holiday_date).format('MM월 DD일 (ddd)')}
                    </TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(h.type)}
                        size="small"
                        sx={{ bgcolor: color + '22', color, fontWeight: 600, border: `1px solid ${color}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: color, border: '1px solid #ccc' }} />
                        <Typography fontSize={13}>{color}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openEdit(h)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(h)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={dialog !== null} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog === 'create' ? '휴일/행사 추가' : '수정'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField
            label="날짜"
            type="date"
            size="small"
            value={form.holiday_date}
            onChange={(e) => setForm((f) => ({ ...f, holiday_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="이름"
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="예: 설날, 단체 연차, 체육대회"
          />
          <FormControl size="small">
            <InputLabel>구분</InputLabel>
            <Select
              value={form.type}
              label="구분"
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {TYPE_OPTIONS.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 색상 선택 */}
          <Box>
            <Typography fontSize={13} color="text.secondary" mb={0.8}>
              색상 (비워두면 구분별 기본색 사용)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1 }}>
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: f.color === c ? '' : c }))}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: c,
                    cursor: 'pointer',
                    border: form.color === c ? '3px solid #333' : '2px solid transparent',
                    boxSizing: 'border-box',
                    '&:hover': { opacity: 0.8 },
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: form.color || getTypeColor(form.type), border: '1px solid #ccc' }} />
              <TextField
                size="small"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="#ef5350"
                sx={{ width: 120 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>취소</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.holiday_date || !form.name}>저장</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
