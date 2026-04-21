import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag as TagIcon } from 'lucide-react'
import { tagApi } from '../services/api'
import { Tag } from '../types'

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

export default function Tags() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: tags, isLoading } = useQuery<{ data: Tag[] }>({
    queryKey: ['tags'],
    queryFn: tagApi.getTags,
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  const tagList = tags?.data || []

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-base lg:text-lg font-medium text-gray-800">Etiketler</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-primary-500 text-white text-xs lg:text-sm font-normal rounded-xl hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Etiket Oluştur</span>
          <span className="sm:hidden">Oluştur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        {tagList.map((tag) => (
          <div
            key={tag.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-5 flex items-center gap-3 lg:gap-4 hover:shadow-md active:scale-98 transition-all"
          >
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${tag.color}20` }}
            >
              <TagIcon className="w-5 h-5" style={{ color: tag.color }} />
            </div>
            <div>
              <p className="text-sm text-gray-600">{tag.name}</p>
              <span
                className="inline-block mt-1 px-3 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            </div>
          </div>
        ))}

        {tagList.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
            <TagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Henüz etiket yok</p>
            <p className="text-xs text-gray-400 mt-1">Maillerinizi organize etmek için etiket oluşturun</p>
          </div>
        )}
      </div>

      {showForm && (
        <CreateTagModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['tags'] })
          }}
        />
      )}
    </div>
  )
}

interface CreateTagModalProps {
  onClose: () => void
  onSuccess: () => void
}

function CreateTagModal({ onClose, onSuccess }: CreateTagModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => tagApi.createTag(data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create tag')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate({ name, color })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-800">Etiket Oluştur</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-2">Etiket Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              placeholder="Önemli"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Renk</label>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-full aspect-square rounded-xl transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              {createMutation.isPending ? 'Oluşturuluyor...' : 'Etiket Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
