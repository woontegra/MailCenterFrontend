import { X } from 'lucide-react'
import { format } from 'date-fns'
import { Mail } from '../../types'

interface MailDetailProps {
  mail: Mail
  onClose: () => void
}

export default function MailDetail({ mail, onClose }: MailDetailProps) {
  return (
    <div className="w-96 bg-white border-l border-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Mail Detayı</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {mail.subject || '(Konu yok)'}
          </h3>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Gönderen:</span>
              <span className="ml-2 text-gray-600">{mail.from_address}</span>
            </div>
            <div>
              <span className="text-gray-400">Alıcı:</span>
              <span className="ml-2 text-gray-600">{mail.to_address}</span>
            </div>
            <div>
              <span className="text-gray-400">Tarih:</span>
              <span className="ml-2 text-gray-600">
                {format(new Date(mail.date), 'PPpp')}
              </span>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <div className="text-sm text-gray-600 whitespace-pre-wrap">
            {mail.body_preview}
          </div>
        </div>

        {mail.tags && mail.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Etiketler</p>
            <div className="flex flex-wrap gap-2">
              {mail.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 text-xs rounded-full"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100">
        <button className="w-full py-2.5 bg-primary-500 text-white text-sm font-normal rounded-xl hover:bg-primary-600 transition-colors">
          Yanıtla
        </button>
      </div>
    </div>
  )
}
