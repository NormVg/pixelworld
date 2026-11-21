// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Global design tokens and page styles
  css: ['~/assets/css/main.css'],

  // Register components by file name so <PixelWorld>, <PixelPanel>,
  // <PixelButton> and <PixelBadge> resolve exactly as written.
  components: [{ path: '~/components', pathPrefix: false }],

  app: {
    head: {
      title: 'Pixelworld: a cozy pixel forest',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'description',
          content:
            'A small, cozy pixel-art forest to wander at your own pace: lantern paths, a quiet pond, and a campfire worth sitting by.'
        },
        { name: 'theme-color', content: '#16211a' }
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
    }
  }
})
