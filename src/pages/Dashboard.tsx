import { useQuery } from '@tanstack/react-query'
import { Mail, Star, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { dashboardApi, mailApi } from '../services/api'
import { DashboardStats } from '../types'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{ data: DashboardStats }>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: recentMails } = useQuery({
    queryKey: ['recent-mails'],
    queryFn: () => mailApi.getMails({ is_deleted: false }),
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statsData = stats?.data

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-medium text-gray-800 mb-4 lg:mb-6">Genel Bakış</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-6">
        <StatCard
          icon={Inbox}
          label="Okunmamış Mailler"
          value={statsData?.unread || 0}
          change="+12 bugün"
          color="blue"
        />
        <StatCard
          icon={Star}
          label="Önemli"
          value={statsData?.starred || 0}
          change="+3 bu hafta"
          color="yellow"
        />
        <StatCard
          icon={Mail}
          label="Toplam Hesap"
          value={statsData?.accounts?.length || 0}
          change="Aktif"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-5 hover:shadow-md transition">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Hesaplar</h2>
          <div className="space-y-2 max-h-64 lg:max-h-none overflow-auto">
            {statsData?.accounts?.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all"
              >
                <div>
                  <p className="text-sm text-gray-600">{account.name}</p>
                  <p className="text-xs text-gray-400">{account.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {account.total_mails} mail
                  </p>
                  <p className="text-xs text-gray-400">
                    {account.unread_mails} okunmadı
                  </p>
                </div>
              </div>
            ))}
            {(!statsData?.accounts || statsData.accounts.length === 0) && (
              <p className="text-sm text-gray-600 text-center py-8">
                Henüz hesap eklenmedi. Başlamak için ilk hesabınızı ekleyin.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-5 hover:shadow-md transition">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Son Mailler</h2>
          <div className="space-y-2 max-h-64 lg:max-h-none overflow-auto">
            {recentMails?.data?.slice(0, 5).map((mail: any) => (
              <div
                key={mail.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">
                    {mail.subject || '(Konu yok)'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{mail.from_address}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-3">
                  {format(new Date(mail.date), 'dd MMM')}
                </span>
              </div>
            ))}
            {(!recentMails?.data || recentMails.data.length === 0) && (
              <p className="text-sm text-gray-600 text-center py-8">
                Henüz mail yok
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  change: string
  color: 'blue' | 'yellow' | 'green'
}

function StatCard({ icon: Icon, label, value, change, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-light text-gray-800 mb-1">{value}</p>
        <p className="text-xs text-gray-400">{change}</p>
      </div>
    </div>
  )
}
