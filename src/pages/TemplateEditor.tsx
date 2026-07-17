import EmailTemplateEditor from '../components/templates/EmailTemplateEditor'
import { useParams } from 'react-router-dom'

export default function TemplateEditorPage() {
  const { id } = useParams()
  const templateId = id && id !== 'new' ? Number(id) : undefined
  return <EmailTemplateEditor templateId={Number.isFinite(templateId) ? templateId : undefined} />
}
