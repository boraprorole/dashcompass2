import { createFileRoute, redirect } from '@tanstack/react-router';
import { exchangeTiktokCode, saveTiktokConnection } from '@/lib/tiktok.server';
import { z } from 'zod';

const tiktokCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
});

export const Route = createFileRoute('/api/public/tiktok/oauth/callback')({
  validateSearch: (search) => tiktokCallbackSchema.parse(search),
  loader: async ({ search }) => {
    const { code, state } = search;

    if (!code || !state) {
      console.error('TikTok OAuth Error: Missing code or state');
      throw redirect({ to: '/admin' });
    }

    try {
      const decodedState = JSON.parse(atob(state));
      const { reportId } = decodedState;

      const tokens = await exchangeTiktokCode(code);
      
      // Salva o primeiro advertiser_id disponível como padrão se houver
      const advertiserId = tokens.advertiser_ids?.[0];

      await saveTiktokConnection({
        reportId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        advertiserId
      });

      throw redirect({
        to: '/admin',
        search: { reportId }
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'Redirect') throw error;
      console.error('TikTok OAuth Error:', error);
      throw redirect({ to: '/admin' });
    }
  },
});

