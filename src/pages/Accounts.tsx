import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Mail } from 'lucide-react'
import { accountApi } from '../services/api'
import { Account } from '../types'

export default function Accounts() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: accounts, isLoading } = useQuery<{ data: Account[] }>({
    queryKey: ['accounts'],
    queryFn: accountApi.getAccounts,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  const accountList = accounts?.data || []

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-base lg:text-lg font-medium text-gray-800">Hesaplar</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-primary-500 text-white text-xs lg:text-sm font-normal rounded-xl hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Hesap Ekle</span>
          <span className="sm:hidden">Ekle</span>
        </button>
      </div>

      <div className="space-y-2 lg:space-y-3">
        {accountList.map((account) => (
          <div
            key={account.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-5 flex items-center justify-between hover:shadow-md active:scale-98 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{account.name}</p>
                <p className="text-xs text-gray-400">{account.email}</p>
              </div>
            </div>
            <button
              onClick={() => deleteMutation.mutate(account.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {accountList.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Henüz hesap yok</p>
            <p className="text-xs text-gray-400 mt-1">Başlamak için ilk e-posta hesabınızı ekleyin</p>
          </div>
        )}
      </div>

      {showForm && (
        <AddAccountModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
          }}
        />
      )}
    </div>
  )
}

interface AddAccountModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddAccountModal({ onClose, onSuccess }: AddAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_name: '',
    imap_host: '',
    imap_port: 993,
    imap_user: '',
    imap_password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: any) => accountApi.createAccount(data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create account')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-800">E-posta Hesabı Ekle</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-2">Hesap Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              placeholder="İş E-postası"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Firma Adı (Opsiyonel)</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              placeholder="Mercan Danışmanlık"
            />
          </div>

          <div>
            <label className="block text-sm font-normal text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">IMAP Host</label>
              <input
                type="text"
                value={formData.imap_host}
                onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="imap.gmail.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">IMAP Port</label>
              <input
                type="number"
                value={formData.imap_port}
                onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-normal text-gray-700 mb-2">IMAP Username</label>
            <input
              type="text"
              value={formData.imap_user}
              onChange={(e) => setFormData({ ...formData, imap_user: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-normal text-gray-700 mb-2">IMAP Password</label>
            <input
              type="password"
              value={formData.imap_password}
              onChange={(e) => setFormData({ ...formData, imap_password: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-normal rounded-xl hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-primary-500 text-white text-sm font-normal rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Ekleniyor...' : 'Hesap Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
