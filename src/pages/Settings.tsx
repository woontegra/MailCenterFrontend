import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { User, Lock, Building, Bell, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'

export default function Settings() {
  const { user } = useAuthStore()
  const { addToast } = useNotificationStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'organization' | 'notifications'>('profile')

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Güvenlik', icon: Lock },
    { id: 'organization', label: 'Organizasyon', icon: Building },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <h1 className="text-lg font-medium text-gray-800 mb-6">Ayarlar</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-black font-medium'
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'organization' && <OrganizationSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings() {
  const { user } = useAuthStore()
  const { addToast } = useNotificationStore()
  const [formData, setFormData] = useState({
    name: user?.email || '',
    email: user?.email || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addToast({ type: 'success', title: 'Profil güncellendi' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Profil Bilgileri</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">İsim</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">E-posta</label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl opacity-50 cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-500 text-white text-sm rounded-xl hover:bg-primary-600 transition-colors"
        >
          Kaydet
        </button>
      </form>
    </div>
  )
}

function SecuritySettings() {
  const { addToast } = useNotificationStore()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      addToast({ type: 'error', title: 'Şifreler eşleşmiyor' })
      return
    }
    addToast({ type: 'success', title: 'Şifre güncellendi' })
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Şifre Değiştir</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Mevcut Şifre</label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Yeni Şifre</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
            required
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-500 text-white text-sm rounded-xl hover:bg-primary-600 transition-colors"
        >
          Şifreyi Güncelle
        </button>
      </form>
    </div>
  )
}

function OrganizationSettings() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Organizasyon Ayarları</h2>
      <p className="text-sm text-gray-600">Organizasyon ayarları yakında eklenecek.</p>
    </div>
  )
}

function NotificationSettings() {
  const { addToast } = useNotificationStore()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    soundAlerts: false,
    desktopNotifications: true,
  })

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] })
    addToast({ type: 'success', title: 'Ayar güncellendi' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Bildirim Tercihleri</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900">E-posta Bildirimleri</p>
            <p className="text-xs text-gray-500">Yeni mailler için e-posta al</p>
          </div>
          <button
            onClick={() => handleToggle('emailNotifications')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.emailNotifications ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.emailNotifications ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900">Sesli Uyarılar</p>
            <p className="text-xs text-gray-500">Yeni mail geldiğinde ses çal</p>
          </div>
          <button
            onClick={() => handleToggle('soundAlerts')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.soundAlerts ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.soundAlerts ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900">Masaüstü Bildirimleri</p>
            <p className="text-xs text-gray-500">Tarayıcı bildirimleri göster</p>
          </div>
          <button
            onClick={() => handleToggle('desktopNotifications')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.desktopNotifications ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.desktopNotifications ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
