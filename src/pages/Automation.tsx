import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit, Power, Zap } from 'lucide-react'
import { api } from '../services/api'
import { useNotificationStore } from '../store/notificationStore'

export default function Automation() {
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const queryClient = useQueryClient()
  const { addToast } = useNotificationStore()

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const res = await api.get('/automation')
      return res.data.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/automation/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      addToast({ type: 'success', title: 'Kural silindi' })
    }
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: any) => api.put(`/automation/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      addToast({ type: 'success', title: 'Kural güncellendi' })
    }
  })

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-800">Otomasyon Kuralları</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm rounded-xl hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Kural Oluştur
        </button>
      </div>

      <div className="space-y-3">
        {rules?.map((rule: any) => (
          <div
            key={rule.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className={`w-5 h-5 ${rule.is_active ? 'text-primary-500' : 'text-gray-400'}`} />
                  <h3 className="text-base font-medium text-gray-900">{rule.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {rule.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Koşullar:</strong> {rule.conditions?.length || 0} koşul</p>
                  <p><strong>Aksiyonlar:</strong> {rule.actions?.length || 0} aksiyon</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Power className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    setEditingRule(rule)
                    setShowForm(true)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(rule.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules?.length === 0 && (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Henüz otomasyon kuralı yok</p>
            <p className="text-xs text-gray-400 mt-1">Yeni kural oluşturarak başlayın</p>
          </div>
        )}
      </div>

      {showForm && (
        <RuleForm
          rule={editingRule}
          onClose={() => {
            setShowForm(false)
            setEditingRule(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingRule(null)
            queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
          }}
        />
      )}
    </div>
  )
}

function RuleForm({ rule, onClose, onSuccess }: any) {
  const { addToast } = useNotificationStore()
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    conditions: rule?.conditions || [{ field: 'subject', operator: 'contains', value: '' }],
    actions: rule?.actions || [{ type: 'add_tag', value: '' }],
    is_active: rule?.is_active ?? true
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (rule) {
        return api.put(`/automation/${rule.id}`, data)
      }
      return api.post('/automation', data)
    },
    onSuccess: () => {
      addToast({ type: 'success', title: rule ? 'Kural güncellendi' : 'Kural oluşturuldu' })
      onSuccess()
    },
    onError: () => {
      addToast({ type: 'error', title: 'İşlem başarısız' })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-800">
            {rule ? 'Kuralı Düzenle' : 'Yeni Kural'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Kural Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              placeholder="Örn: Fatura maillerini etiketle"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Koşullar</label>
            <p className="text-xs text-gray-500 mb-2">Tüm koşullar sağlanmalı (AND)</p>
            {formData.conditions.map((condition: any, index: number) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={condition.field}
                  onChange={(e) => {
                    const newConditions = [...formData.conditions]
                    newConditions[index].field = e.target.value
                    setFormData({ ...formData, conditions: newConditions })
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg"
                >
                  <option value="subject">Konu</option>
                  <option value="from">Gönderen</option>
                  <option value="to">Alıcı</option>
                  <option value="body">İçerik</option>
                </select>
                <select
                  value={condition.operator}
                  onChange={(e) => {
                    const newConditions = [...formData.conditions]
                    newConditions[index].operator = e.target.value
                    setFormData({ ...formData, conditions: newConditions })
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg"
                >
                  <option value="contains">İçerir</option>
                  <option value="equals">Eşittir</option>
                  <option value="starts_with">Başlar</option>
                  <option value="ends_with">Biter</option>
                </select>
                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => {
                    const newConditions = [...formData.conditions]
                    newConditions[index].value = e.target.value
                    setFormData({ ...formData, conditions: newConditions })
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg"
                  placeholder="Değer"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Aksiyonlar</label>
            {formData.actions.map((action: any, index: number) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={action.type}
                  onChange={(e) => {
                    const newActions = [...formData.actions]
                    newActions[index].type = e.target.value
                    setFormData({ ...formData, actions: newActions })
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg"
                >
                  <option value="add_tag">Etiket Ekle</option>
                  <option value="mark_read">Okundu İşaretle</option>
                  <option value="star">Yıldızla</option>
                  <option value="set_status">Durum Değiştir</option>
                </select>
                <input
                  type="text"
                  value={action.value}
                  onChange={(e) => {
                    const newActions = [...formData.actions]
                    newActions[index].value = e.target.value
                    setFormData({ ...formData, actions: newActions })
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg"
                  placeholder="Değer (etiket ID, durum vb.)"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 py-2.5 bg-primary-500 text-white text-sm rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
