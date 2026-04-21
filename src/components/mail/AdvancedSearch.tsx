import { useState } from 'react'
import { Search, X, Calendar } from 'lucide-react'

interface SearchFilters {
  search?: string
  from?: string
  subject?: string
  date_from?: string
  date_to?: string
  account_id?: string
  tag_id?: string
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  onClose: () => void
}

export default function AdvancedSearch({ onSearch, onClose }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(filters)
  }

  const handleReset = () => {
    setFilters({})
    onSearch({})
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-800">Gelişmiş Arama</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Genel Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                placeholder="Konu, gönderen veya içerik..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Gönderen</label>
              <input
                type="text"
                value={filters.from || ''}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Konu</label>
              <input
                type="text"
                value={filters.subject || ''}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                placeholder="Mail konusu"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Başlangıç Tarihi</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Bitiş Tarihi</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 border-0 rounded-xl focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Sıfırla
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary-500 text-white text-sm rounded-xl hover:bg-primary-600 transition-colors"
            >
              Ara
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
