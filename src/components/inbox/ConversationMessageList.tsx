import EmailMessageCard, { type TimelineMessage } from './EmailMessageCard'
import ChatMessageBubble from './ChatMessageBubble'

type Props = {
  messages: TimelineMessage[]
  channelType: string
}

export default function ConversationMessageList({ messages, channelType }: Props) {
  if (messages.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-ink-soft">
        <p>Bu konuşmada henüz mesaj yok.</p>
      </div>
    )
  }

  const isEmail = channelType === 'EMAIL'

  return (
    <div className={`w-full space-y-4 ${isEmail ? '' : 'px-1'}`}>
      {messages.map((m) =>
        isEmail || m.channelType === 'EMAIL' ? (
          <EmailMessageCard key={m.sourceId} message={m} />
        ) : (
          <ChatMessageBubble key={m.sourceId} message={m} channelType={m.channelType || channelType} />
        )
      )}
    </div>
  )
}
