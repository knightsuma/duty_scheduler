import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Button, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert, Chip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import LockResetIcon from '@mui/icons-material/LockReset'
import AddIcon from '@mui/icons-material/Add'
import { getUsers, createUser, updateUser, deleteUser, resetPassword, getCodeGroup } from '../api'

interface User { id: number; login_id: string; user_name: string; role: string; work_type?: string; use_yn: string }
interface WorkCode { code: string; code_name: string }

const ROLE_LABELS: Record<string, string> = { USER: '일반', MANAGER: '매니저', ADMIN: '관리자' }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [workCodes, setWorkCodes] = useState<WorkCode[]>([])
  const [dialog, setDialog] = useState<'create' | 'edit' | 'reset' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState({ login_id: '', password: '', user_name: '', role: 'USER', work_type: '' })
  const [newPw, setNewPw] = useState('')
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

  const fetchUsers = () => getUsers().then((r) => setUsers(r.data))

  useEffect(() => {
    fetchUsers()
    getCodeGroup('WORK_TYPE').then((r) => setWorkCodes(r.data.details.filter((d: any) => d.use_yn === 'Y')))
  }, [])

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity })

  const openCreate = () => {
    setForm({ login_id: '', password: '', user_name: '', role: 'USER', work_type: '' })
    setDialog('create')
  }

  const openEdit = (u: User) => {
    setSelected(u)
    setForm({ login_id: u.login_id, password: '', user_name: u.user_name, role: u.role, work_type: u.work_type ?? '' })
    setDialog('edit')
  }

  const handleCreate = async () => {
    try {
      await createUser({ ...form, work_type: form.work_type || null })
      showSnack('사용자가 추가되었습니다.')
      setDialog(null)
      fetchUsers()
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  const handleEdit = async () => {
    if (!selected) return
    try {
      await updateUser(selected.id, { user_name: form.user_name, role: form.role, work_type: form.work_type || null })
      showSnack('수정되었습니다.')
      setDialog(null)
      fetchUsers()
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`${u.user_name} 사용자를 비활성화하시겠습니까?`)) return
    try {
      await deleteUser(u.id)
      showSnack('비활성화되었습니다.')
      fetchUsers()
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  const handleReset = async () => {
    if (!selected) return
    try {
      await resetPassword(selected.id, newPw)
      showSnack('비밀번호가 초기화되었습니다.')
      setDialog(null)
      setNewPw('')
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>사용자 관리</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openCreate}>
          사용자 추가
        </Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              {['아이디', '이름', '권한', '업무구분', '상태', '관리'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.login_id}</TableCell>
                <TableCell>{u.user_name}</TableCell>
                <TableCell>
                  <Chip
                    label={ROLE_LABELS[u.role] ?? u.role}
                    size="small"
                    color={u.role === 'ADMIN' ? 'error' : u.role === 'MANAGER' ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell>{workCodes.find((c) => c.code === u.work_type)?.code_name ?? u.work_type ?? '-'}</TableCell>
                <TableCell>
                  <Chip label={u.use_yn === 'Y' ? '활성' : '비활성'} size="small"
                    color={u.use_yn === 'Y' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => { setSelected(u); setNewPw(''); setDialog('reset') }}>
                    <LockResetIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(u)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={dialog === 'create' || dialog === 'edit'} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog === 'create' ? '사용자 추가' : '사용자 수정'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {dialog === 'create' && (
            <>
              <TextField label="아이디" size="small" value={form.login_id}
                onChange={(e) => setForm((f) => ({ ...f, login_id: e.target.value }))} required />
              <TextField label="초기 비밀번호" type="password" size="small" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </>
          )}
          <TextField label="이름" size="small" value={form.user_name}
            onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))} required />
          <FormControl size="small">
            <InputLabel>권한</InputLabel>
            <Select value={form.role} label="권한" onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <MenuItem value="USER">일반</MenuItem>
              <MenuItem value="MANAGER">매니저</MenuItem>
              <MenuItem value="ADMIN">관리자</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>업무구분</InputLabel>
            <Select value={form.work_type} label="업무구분" onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value }))}>
              <MenuItem value=""><em>없음</em></MenuItem>
              {workCodes.map((c) => <MenuItem key={c.code} value={c.code}>{c.code_name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>취소</Button>
          <Button variant="contained" onClick={dialog === 'create' ? handleCreate : handleEdit}>저장</Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={dialog === 'reset'} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{selected?.user_name} 비밀번호 초기화</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <TextField label="새 비밀번호" type="password" size="small" fullWidth value={newPw}
            onChange={(e) => setNewPw(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>취소</Button>
          <Button variant="contained" onClick={handleReset} disabled={!newPw}>초기화</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
