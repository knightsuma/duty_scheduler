import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Snackbar, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { getCodeGroups, createCodeDetail, updateCodeDetail, deleteCodeDetail } from '../api'

interface Detail { id: number; code: string; code_name: string; sort_order: number; use_yn: string }
interface Group { id: number; group_code: string; group_name: string; details: Detail[] }

export default function CodesPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [tab, setTab] = useState(0)
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Detail | null>(null)
  const [form, setForm] = useState({ code: '', code_name: '', sort_order: 0 })
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

  const fetchGroups = () => getCodeGroups().then((r) => setGroups(r.data))

  useEffect(() => { fetchGroups() }, [])

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity })

  const currentGroup = groups[tab]

  const openCreate = () => {
    setForm({ code: '', code_name: '', sort_order: (currentGroup?.details.length ?? 0) + 1 })
    setDialog('create')
  }

  const openEdit = (d: Detail) => {
    setSelected(d)
    setForm({ code: d.code, code_name: d.code_name, sort_order: d.sort_order })
    setDialog('edit')
  }

  const handleCreate = async () => {
    if (!currentGroup) return
    try {
      await createCodeDetail(currentGroup.id, { ...form, use_yn: 'Y' })
      showSnack('코드가 추가되었습니다.')
      setDialog(null)
      fetchGroups()
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  const handleEdit = async () => {
    if (!selected) return
    try {
      await updateCodeDetail(selected.id, { code_name: form.code_name, sort_order: form.sort_order })
      showSnack('수정되었습니다.')
      setDialog(null)
      fetchGroups()
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  const handleToggleUse = async (d: Detail) => {
    try {
      await updateCodeDetail(d.id, { use_yn: d.use_yn === 'Y' ? 'N' : 'Y' })
      fetchGroups()
    } catch (e: any) { showSnack(e.response?.data?.detail ?? '오류 발생', 'error') }
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>코드 관리</Typography>
      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {groups.map((g) => <Tab key={g.id} label={g.group_name} />)}
        </Tabs>

        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              코드 추가
            </Button>
          </Box>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                {['코드', '코드명', '순서', '사용여부', '관리'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(currentGroup?.details ?? [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell><code>{d.code}</code></TableCell>
                    <TableCell>{d.code_name}</TableCell>
                    <TableCell>{d.sort_order}</TableCell>
                    <TableCell>
                      <Chip
                        label={d.use_yn === 'Y' ? '사용' : '미사용'}
                        size="small"
                        color={d.use_yn === 'Y' ? 'success' : 'default'}
                        onClick={() => handleToggleUse(d)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openEdit(d)}><EditIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog === 'create' ? '코드 추가' : '코드 수정'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {dialog === 'create' && (
            <TextField label="코드 (영문/숫자)" size="small" value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required />
          )}
          <TextField label="코드명" size="small" value={form.code_name}
            onChange={(e) => setForm((f) => ({ ...f, code_name: e.target.value }))} required />
          <TextField label="정렬순서" type="number" size="small" value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>취소</Button>
          <Button variant="contained" onClick={dialog === 'create' ? handleCreate : handleEdit}>저장</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
