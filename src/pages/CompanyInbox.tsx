import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Mail, ChevronDown } from 'lucide-react'
import { api } from '../services/api'
import { MailListSkeleton } from '../components/common/SkeletonLoader'
import EmptyState from '../components/common/EmptyState'

export default function CompanyInbox() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get('/inbox/companies')
      return res.data.data
    }
  })

  const { data: groupedInbox, isLoading: inboxLoading } = useQuery({
    queryKey: ['grouped-inbox', selectedCompany],
    queryFn: async () => {
      const params = selectedCompany ? { company_name: selectedCompany } : {}
      const res = await api.get('/inbox/grouped', { params })
      return res.data.data
    }
  })

  if (companiesLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <EmptyState
          icon={Building2}
          title="Henüz firma oluşturulmadı"
          description="Mail hesaplarınıza firma adı ekleyerek gruplayabilirsiniz"
        />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-800">Firma Bazlı Inbox</h1>
        
        <div className="relative">
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value || null)}
            className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tüm Firmalar</option>
            {companies?.map((company: any) => (
              <option key={company.company_name} value={company.company_name}>
                {company.company_name} ({company.account_count})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {inboxLoading ? (
        <MailListSkeleton />
      ) : (
        <div className="space-y-6">
          {groupedInbox?.map((group: any) => (
            <div key={group.companyName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <h2 className="text-base font-medium text-gray-900">{group.companyName}</h2>
                    <span className="text-xs text-gray-500">
                      {group.accounts.length} hesap
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{group.mailCount} mail</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {group.mails.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Bu firmada henüz mail yok</p>
                  </div>
                ) : (
                  group.mails.slice(0, 10).map((mail: any) => (
                    <div key={mail.id} className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {mail.subject || '(Konu yok)'}
                            </p>
                            {!mail.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{mail.from_address}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            via {mail.account_email}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(mail.date).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
