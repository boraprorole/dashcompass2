import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Meta/Instagram Webhooks endpoint.
 *
 * GET  -> verification handshake (hub.mode / hub.verify_token / hub.challenge)
 * POST -> event delivery (signature verified with the app secret when available)
 */
export const Route = createFileRoute('/api/public/instagram/webhook')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge') ?? ''

        const expected =
          process.env['META_WEBHOOK_VERIFY_TOKEN'] ??
          process.env['INSTAGRAM_WEBHOOK_VERIFY_TOKEN'] ??
          ''

        if (mode === 'subscribe' && expected && token === expected) {
          // Meta requires the raw challenge string, plain text, status 200.
          return new Response(challenge, {
            status: 200,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          })
        }

        return new Response('Forbidden', { status: 403 })
      },

      POST: async ({ request }) => {
        const body = await request.text()
        const appSecret =
          process.env['INSTAGRAM_APP_SECRET'] ?? process.env['META_APP_SECRET'] ?? ''
        const header = request.headers.get('x-hub-signature-256')

        if (appSecret && header?.startsWith('sha256=')) {
          const expected = createHmac('sha256', appSecret).update(body).digest('hex')
          const got = header.slice('sha256='.length)
          const a = Buffer.from(got, 'utf8')
          const b = Buffer.from(expected, 'utf8')
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response('Invalid signature', { status: 401 })
          }
        }

        // Acknowledge fast; Meta retries on non-200.
        try {
          const payload = JSON.parse(body) as unknown
          console.log('[instagram-webhook] event', JSON.stringify(payload).slice(0, 2000))
        } catch {
          console.log('[instagram-webhook] non-JSON body')
        }

        return new Response('EVENT_RECEIVED', { status: 200 })
      },
    },
  },
})
