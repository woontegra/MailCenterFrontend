export interface Mail {
  id: number
  subject: string
  from_address: string
  to_address: string
  date: string
  body_preview: string
  is_read: boolean
  is_starred: boolean
  is_deleted: boolean
  is_sent: boolean
  account_email?: string
  account_name?: string
  tags?: Tag[]
}

export interface Tag {
  id: number
  name: string
  color: string
}

export interface Account {
  id: number
  name: string
  email: string
  is_active: boolean
  brand_id?: number | null
  brand_name?: string | null
  imap_connection_status?: string | null
  smtp_connection_status?: string | null
  last_connection_test_at?: string | null
}

export interface DashboardStats {
  unread: number
  starred: number
  accounts: {
    id: number
    name: string
    email: string
    total_mails: number
    unread_mails: number
  }[]
}
