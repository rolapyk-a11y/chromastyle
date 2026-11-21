import { redirect } from 'next/navigation'

// The analyse flow is available without login at /analyze
export default function AnalyzeDashboardRedirect() {
  redirect('/analyze')
}
