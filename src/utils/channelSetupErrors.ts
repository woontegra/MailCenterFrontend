/** Map channel-connection API errors to clear Turkish messages (never redirect). */
export function channelSetupApiError(err: any, fallback: string): string {
  const status = err?.response?.status
  const raw = err?.response?.data?.error || err?.response?.data?.message

  if (status === 401) return 'Oturum geçersiz. Lütfen yeniden giriş yapın.'
  if (status === 403) return 'Yetkisiz işlem. Kanal bağlama yetkiniz (CHANNEL_MANAGE) yok.'
  if (status === 404) return 'Kanal kaydı bulunamadı.'
  if (status === 409) return raw || 'Bu marka için kanal kaydı zaten var.'
  if (status === 429) return 'Çok fazla istek. Lütfen kısa süre sonra tekrar deneyin.'
  if (status === 502 || status === 503 || status === 504) {
    return 'Sağlayıcı yanıt vermedi. Daha sonra tekrar deneyin.'
  }
  if (typeof raw === 'string' && raw.trim()) return raw
  if (err?.message && /network|timeout|failed to fetch/i.test(String(err.message))) {
    return 'Sunucuya bağlanılamadı. Ağ bağlantınızı kontrol edin.'
  }
  return fallback
}
