import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, IconButton, Tooltip, Avatar,
  useMediaQuery, useTheme,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PeopleIcon from '@mui/icons-material/People'
import SettingsIcon from '@mui/icons-material/Settings'
import EventIcon from '@mui/icons-material/Event'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuthStore } from '../store/authStore'

const DRAWER_WIDTH = 220

const NAV_ITEMS = [
  { label: '메인 대시보드', path: '/dashboard', icon: <DashboardIcon /> },
  { label: '월간 현황',     path: '/monthly',   icon: <CalendarMonthIcon /> },
  { label: '사용자 관리',   path: '/users',     icon: <PeopleIcon />,       roles: ['ADMIN'] },
  { label: '휴일/행사 관리',path: '/holidays',  icon: <EventIcon />,        roles: ['ADMIN'] },
  { label: '코드 관리',     path: '/codes',     icon: <SettingsIcon />,     roles: ['ADMIN'] },
]

export default function MainLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { userName, role, logout } = useAuthStore()

  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))   // < 900px

  // 데스크톱: 기본 열림 / 모바일: 기본 닫힘
  const [open, setOpen] = useState(!isMobile)

  const handleLogout = () => { logout(); navigate('/login') }

  const handleNavClick = (path: string) => {
    navigate(path)
    if (isMobile) setOpen(false)   // 모바일에서 메뉴 선택 후 자동 닫기
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role ?? ''),
  )

  const drawerContent = (
    <>
      <Divider />
      <List dense>
        {visibleItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNavClick(item.path)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* ── 상단 앱바 ── */}
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense">
          <IconButton color="inherit" edge="start" onClick={() => setOpen((v) => !v)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 16 }}>
            업무 스케줄 관리 시스템
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: 'secondary.main' }}>
              {userName?.[0] ?? 'U'}
            </Avatar>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {userName}
            </Typography>
            <Tooltip title="로그아웃">
              <IconButton color="inherit" size="small" onClick={handleLogout}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── 모바일: Temporary Drawer (오버레이) ── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: '48px',
              height: 'calc(100% - 48px)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ── 데스크톱: Persistent Drawer (공간 차지) ── */}
      {!isMobile && (
        <Drawer
          variant="persistent"
          open={open}
          sx={{
            width: open ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            transition: 'width 0.2s',
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: '48px',
              height: 'calc(100% - 48px)',
              transition: 'width 0.2s',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2 },
          mt: '48px',
          overflow: 'auto',
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
