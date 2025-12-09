import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const iconColor = (active) => (active ? '#fff' : 'var(--muted)')

const IconHome = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 10.5 12 4l7 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-3v5H6a1 1 0 0 1-1-1z"
      stroke={iconColor(active)}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

const IconPlan = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="5"
      width="16"
      height="15"
      rx="2"
      stroke={iconColor(active)}
      strokeWidth="1.6"
    />
    <path d="M4 9h16" stroke={iconColor(active)} strokeWidth="1.6" />
    <path d="M9 5v-2m6 2V3" stroke={iconColor(active)} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const IconTracking = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 13.5 10 9l3 4 5-6"
      stroke={iconColor(active)}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 19h14"
      stroke={iconColor(active)}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="5" cy="19" r="1" fill={iconColor(active)} />
    <circle cx="19" cy="19" r="1" fill={iconColor(active)} />
  </svg>
)

const IconProfile = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="8"
      r="3.2"
      stroke={iconColor(active)}
      strokeWidth="1.6"
    />
    <path
      d="M5 20c.6-3.2 3.3-5.5 7-5.5s6.4 2.3 7 5.5"
      stroke={iconColor(active)}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const IconClients = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="9" r="3" stroke={iconColor(active)} strokeWidth="1.6" />
    <circle cx="17" cy="7" r="2.5" stroke={iconColor(active)} strokeWidth="1.4" />
    <path
      d="M4 20c.5-3 2.6-5 5-5s4.5 2 5 5"
      stroke={iconColor(active)}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M14.5 17c.3-1.8 1.6-3 3.5-3 .9 0 1.7.3 2.3.7"
      stroke={iconColor(active)}
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

const IconMonitoring = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2"
      stroke={iconColor(active)}
      strokeWidth="1.6"
    />
    <path
      d="M7 15.5 11 11l3 3 3-5"
      stroke={iconColor(active)}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="11" cy="11" r="0.8" fill={iconColor(active)} />
  </svg>
)

const Tab = ({ label, active, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`bottom-nav__tab ${active ? 'bottom-nav__tab--active' : ''}`}
  >
    <div className="w-6 h-6 mb-1">{Icon ? <Icon active={active} /> : null}</div>
    <div>{label}</div>
  </button>
)

export default function BottomNav({ user }){
  const nav = useNavigate()
  const loc = useLocation()
  const isTrainer = user?.role === 'trainer'

  const athleteTabs = [
    { path: '/', label: 'Главная', icon: IconHome },
    { path: '/calendar', label: 'План', icon: IconPlan },
    { path: '/tracking', label: 'Трекинг', icon: IconTracking },
    { path: '/profile', label: 'Профиль', icon: IconProfile }
  ]

  const trainerTabs = [
    { path: '/', label: 'Главная', icon: IconHome, match: (path) => path === '/' },
    { path: '/clients', label: 'Клиенты', icon: IconClients, match: (path) => path === '/clients' || path.startsWith('/clients/') },
    { path: '/monitoring', label: 'Мониторинг', icon: IconMonitoring }
  ]

  const tabs = isTrainer ? trainerTabs : athleteTabs

  const isActive = (tabPath, match) => {
    if (typeof match === 'function') return match(loc.pathname)
    return loc.pathname === tabPath
  }

  return (
    <div className="bottom-nav safe-bottom">
      <div className="bottom-nav__inner">
        <div className="bottom-nav__bar">
          {tabs.map((tab) => (
            <Tab
              key={tab.path}
              label={tab.label}
              active={isActive(tab.path, tab.match)}
              onClick={() => nav(tab.path)}
              icon={tab.icon}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
