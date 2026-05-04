/**
 * 主布局组件（侧边栏 + 内容区）
 */
import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge, Typography } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  SafetyOutlined,
  PartitionOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import styles from './MainLayout.module.css'

const { Sider, Content, Header } = Layout
const { Text } = Typography

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '概览仪表盘',
  },
  {
    key: '/evaluations',
    icon: <SafetyCertificateOutlined />,
    label: '评估任务',
  },
  {
    key: '/pentest-hub',
    icon: <SafetyOutlined />,
    label: 'AI 渗透中心',
  },
  {
    key: '/blueprint',
    icon: <PartitionOutlined />,
    label: '产品整改蓝图',
  },
  {
    key: '/checklists',
    icon: <CheckSquareOutlined />,
    label: '检查模板库',
  },
  {
    key: '/reports',
    icon: <FileTextOutlined />,
    label: '报告中心',
  },
  {
    type: 'divider' as const,
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '账号设置',
    },
    {
      key: 'switch-account',
      icon: <UserOutlined />,
      label: '切换账号',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate('/settings')
    }
    if (key === 'switch-account') {
      logout()
      navigate('/login')
    }
    if (key === 'logout') {
      logout()
      navigate('/login')
    }
  }

  return (
    <Layout className={styles.layout}>
      {/* 侧边栏 */}
      <Sider theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        className={styles.sider}
        trigger={null}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <SafetyOutlined className={styles.logoIcon} />
          {!collapsed && (
            <span className={styles.logoText}>AI 评估工作台</span>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
          theme="light"
        />
      </Sider>

      <Layout>
        {/* 顶部栏 */}
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            {/* 折叠按钮 */}
            <button
              className={styles.collapseBtn}
              onClick={() => setCollapsed(!collapsed)}
              aria-label="折叠侧边栏"
            >
              {collapsed ? '▶' : '◀'}
            </button>
          </div>

          <div className={styles.headerRight}>
            {/* 通知 */}
            <Badge count={3} size="small">
              <BellOutlined className={styles.headerIcon} />
            </Badge>

            {/* 用户菜单 */}
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
            >
              <div className={styles.userInfo}>
                <Avatar size={32} icon={<UserOutlined />} className={styles.avatar} />
                <Text className={styles.username}>{user?.username ?? 'Admin'}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区 */}
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
