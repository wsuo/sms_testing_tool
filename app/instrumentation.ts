export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry configuration
    const Sentry = await import('@sentry/nextjs')
    
    Sentry.init({
      dsn: "https://bbfef629619156e66eb300d8908d9886@o4509721309216768.ingest.us.sentry.io/4509721382944768",
      tracesSampleRate: 1.0,
      debug: true,
      sendDefaultPii: true,
      environment: process.env.NODE_ENV || 'development',
      beforeSend(event) {
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.value?.includes('ECONNRESET') || 
              error?.value?.includes('ENOTFOUND') ||
              error?.value?.includes('ECONNREFUSED')) {
            return null;
          }
        }
        console.log('Sentry: Sending server event:', event.event_id);
        return event;
      },
      initialScope: {
        tags: {
          component: "sms-testing-tool",
          platform: "server"
        },
      },
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry configuration
    const Sentry = await import('@sentry/nextjs')
    
    Sentry.init({
      dsn: "https://bbfef629619156e66eb300d8908d9886@o4509721309216768.ingest.us.sentry.io/4509721382944768",
      tracesSampleRate: 1.0,
      debug: true,
    })
  }
}