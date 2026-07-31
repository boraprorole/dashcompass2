import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/meta/oauth/callback')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api/public/meta/oauth/callback"!</div>
}
