import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Plus, Send, RefreshCw, Search } from 'lucide-react'
import { format } from 'date-fns'
import { mailApi, accountApi } from '../services/api'
import { Mail } from '../types'
import AdvancedSearch from '../components/mail/AdvancedSearch'

type FilterType = 'all' | 'unread' | 'starred'

export default function Inbox() {
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchFilters, setSearchFilters] = useState<any>({})
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: mails, isLoading } = useQuery<{ data: Mail[] }>({
    queryKey: ['mails', filter, searchFilters],
    queryFn: () => {
      const params: any = { is_deleted: false, ...searchFilters }
      if (filter === 'unread') params.is_read = false
      if (filter === 'starred') params.is_starred = true
      return mailApi.getMails(params)
    },
  })

  const handleSearch = (filters: any) => {
    setSearchFilters(filters)
    setShowAdvancedSearch(false)
  }

  const starMutation = useMutation({
    mutationFn: ({ id, is_starred }: { id: number; is_starred: boolean }) =>
      mailApi.updateStar(id, is_starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails'] })
    },
  })

  const readMutation = useMutation({
    mutationFn: ({ id, is_read }: { id: number; is_read: boolean }) =>
      mailApi.updateRead(id, is_read),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mailApi.deleteMail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails'] })
      setSelectedMail(null)
    },
  })

  const handleMailClick = (mail: Mail) => {
    setSelectedMail(mail)
    if (!mail.is_read) {
      readMutation.mutate({ id: mail.id, is_read: true })
    }
  }

  // Pull to refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current && scrollRef.current && scrollRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY
      const distance = Math.max(0, Math.min(currentY - touchStartY.current, 100))
      setPullDistance(distance)
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true)
      await queryClient.invalidateQueries({ queryKey: ['mails'] })
      setTimeout(() => {
        setIsRefreshing(false)
        setPullDistance(0)
      }, 500)
    } else {
      setPullDistance(0)
    }
    touchStartY.current = 0
  }

  const mailList = mails?.data || []

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-gray-200 rounded-full w-24"></div>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* ORTA PANEL - Mail Listesi */}
      <div className="flex-1 flex flex-col border-r border-gray-100">
        {/* Üst Bar */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base lg:text-lg font-medium text-gray-800">Gelen Kutusu</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="flex items-center gap-1 px-2 lg:px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ara</span>
              </button>
              <button
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Yeni Mail</span>
              </button>
            </div>
          </div>

          {/* Filtre Pills */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                filter === 'unread'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Okunmamış
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                filter === 'starred'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Önemli
            </button>
          </div>
        </div>

        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
            style={{ height: pullDistance }}
          >
            <RefreshCw
              className={`w-5 h-5 text-primary-500 transition-transform ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ transform: `rotate(${pullDistance * 3.6}deg)` }}
            />
          </div>
        )}

        {/* Mail Listesi */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          {mailList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-gray-400">Henüz mail yok</p>
            </div>
          ) : (
            mailList.map((mail) => (
              <div
                key={mail.id}
                onClick={() => handleMailClick(mail)}
                className={`px-3 lg:px-4 py-3 border-b border-gray-100 cursor-pointer transition-all active:bg-gray-200 ${
                  selectedMail?.id === mail.id
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Sol - Yıldız ve Okunmadı İşareti */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        starMutation.mutate({
                          id: mail.id,
                          is_starred: !mail.is_starred,
                        })
                      }}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          mail.is_starred
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-gray-400'
                        }`}
                      />
                    </button>
                    {!mail.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>

                  {/* Orta - İçerik */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      mail.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'
                    }`}>
                      {mail.subject || '(Konu yok)'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{mail.from_address}</p>
                    <p className="text-xs text-gray-400 truncate">{mail.body_preview}</p>
                    
                    {/* Tag'ler */}
                    {mail.tags && mail.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {mail.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sağ - Tarih */}
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(mail.date), 'dd MMM')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SAĞ PANEL - Mail Detayı */}
      {selectedMail && (
        <div className="w-96 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-medium text-gray-900 mb-3">
              {selectedMail.subject || '(Konu yok)'}
            </h3>
            <div className="space-y-1 text-xs text-gray-500">
              <div>
                <span className="text-gray-400">Gönderen:</span>
                <span className="ml-2">{selectedMail.from_address}</span>
              </div>
              <div>
                <span className="text-gray-400">Alıcı:</span>
                <span className="ml-2">{selectedMail.to_address}</span>
              </div>
              <div>
                <span className="text-gray-400">Tarih:</span>
                <span className="ml-2">
                  {format(new Date(selectedMail.date), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="text-sm text-gray-600 whitespace-pre-wrap">
              {selectedMail.body_preview}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3">
              <button className="flex-1 py-2 text-xs text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors">
                Yanıtla
              </button>
              <button
                onClick={() => {
                  starMutation.mutate({
                    id: selectedMail.id,
                    is_starred: !selectedMail.is_starred,
                  })
                }}
                className="flex-1 py-2 text-xs text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
              >
                {selectedMail.is_starred ? 'Yıldızı Kaldır' : 'Yıldızla'}
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(selectedMail.id)
                }}
                className="flex-1 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSuccess={() => {
            setShowCompose(false)
            queryClient.invalidateQueries({ queryKey: ['mails'] })
          }}
        />
      )}

      {/* Advanced Search */}
      {showAdvancedSearch && (
        <AdvancedSearch
          onSearch={handleSearch}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}
    </div>
  )
}

// Compose Modal Component
interface ComposeModalProps {
  onClose: () => void
  onSuccess: () => void
}

function ComposeModal({ onClose, onSuccess }: ComposeModalProps) {
  const [formData, setFormData] = useState({
    accountId: '',
    to: '',
    subject: '',
    text: '',
  })
  const [error, setError] = useState('')

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountApi.getAccounts,
  })

  const sendMutation = useMutation({
    mutationFn: (data: any) => mailApi.sendMail(data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Mail gönderilemedi')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.accountId) {
      setError('Hesap seçiniz')
      return
    }
    sendMutation.mutate({
      ...formData,
      accountId: parseInt(formData.accountId),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-800">Yeni Mail</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-600 mb-1.5">Hesap</label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              required
            >
              <option value="">Hesap seçiniz</option>
              {accounts?.data?.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1.5">Alıcı</label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1.5">Konu</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:outline-none focus:bg-white focus:shadow-sm transition-all"
              placeholder="Mail konusu"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1.5">İçerik</label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:outline-none focus:bg-white focus:shadow-sm transition-all resize-none"
              rows={8}
              placeholder="Mail içeriği..."
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="flex-1 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sendMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
