import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Mail, Tag, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import axios from 'axios'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await axios.get('/api/analytics/overview')
      return res.data.data
    }
  })

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-medium text-gray-800 mb-6">Analitik</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Günlük Mail Sayısı
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics?.dailyStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Etiket Dağılımı
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics?.tagDistribution || []}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {(analytics?.tagDistribution || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            En Çok Mail Alan Hesaplar
          </h2>
          <div className="space-y-3">
            {(analytics?.topAccounts || []).map((account: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{account.name}</p>
                  <p className="text-xs text-gray-500">{account.email}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">{account.mail_count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Mail Durumları
          </h2>
          <div className="space-y-3">
            {(analytics?.statusDistribution || []).map((status: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{status.status}</span>
                <span className="text-sm font-medium text-gray-900">{status.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
