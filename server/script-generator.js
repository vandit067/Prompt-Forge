/**
 * Advanced template-based generator — produces Claude/Copilot quality prompts
 * without any API calls. Uses a feature registry with real package names,
 * file paths, API routes, DB schemas, and env vars per detected feature.
 */

// ── Feature Registry ──────────────────────────────────────────────────────────
// Ordered by session priority (infrastructure first, UI last)

const FEATURE_REGISTRY = [
  {
    id: 'auth',
    detect: /\b(auth|login|sign.?in|sign.?up|jwt|session|oauth|sso|password)\b/i,
    label: 'Authentication',
    group: 'infrastructure',
    priority: 10,
    packages: ['next-auth@5', '@auth/prisma-adapter'],
    envVars: ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    routes: ['GET|POST /api/auth/[...nextauth]'],
    steps: [
      'npm install next-auth @auth/prisma-adapter',
      'Add Account, Session, VerificationToken models to prisma/schema.prisma (NextAuth standard schema)',
      'Create src/app/api/auth/[...nextauth]/route.ts — NextAuth with PrismaAdapter + Google OAuth provider',
      'Create src/lib/auth.ts — export auth(), signIn(), signOut() helpers',
      'Create src/middleware.ts — protect /dashboard, /settings, /docs behind auth check',
      'Verify: unauthenticated GET /dashboard → 302 redirect to /api/auth/signin',
    ],
    time: '2–3 hours',
  },
  {
    id: 'database',
    detect: /\b(database|db|postgres|postgresql|sqlite|mysql|mongodb|prisma|drizzle|store.*db|db.*store)\b/i,
    label: 'Database & ORM Setup',
    group: 'infrastructure',
    priority: 11,
    packages: ['@prisma/client', 'prisma'],
    envVars: ['DATABASE_URL'],
    steps: [
      'npm install @prisma/client && npm install -D prisma',
      'npx prisma init — creates prisma/schema.prisma with DATABASE_URL in .env',
      'Define base models: User, Studio, AuditLog in prisma/schema.prisma',
      'npx prisma migrate dev --name init',
      'Create src/lib/db.ts — PrismaClient singleton with global caching for dev hot-reload',
      'Verify: npx prisma studio → tables visible; npx prisma db push → no drift',
    ],
    time: '1–2 hours',
  },
  {
    id: 'bugsnag',
    detect: /\b(bugsnag|crash.report|error.track|stability)\b/i,
    label: 'Bugsnag Integration',
    group: 'integration',
    priority: 20,
    packages: ['@bugsnag/js', '@bugsnag/plugin-react'],
    envVars: ['BUGSNAG_API_KEY', 'BUGSNAG_PROJECT_API_KEY'],
    routes: ['GET /api/stability/bugsnag → { errorGroups, crashRate, stabilityScore, trend }'],
    steps: [
      'npm install @bugsnag/js @bugsnag/plugin-react',
      'Create src/lib/bugsnag.ts — BugsnagClient singleton using BUGSNAG_API_KEY, export notifyError()',
      'Create src/services/bugsnag.ts — fetchErrorGroups(), fetchCrashRate(), fetchStabilityScore() using Bugsnag Data API',
      'Create src/app/api/stability/bugsnag/route.ts — GET handler, validate response with Zod, cache 5 min with next: { revalidate: 300 }',
      'Define BugsnagResponse Zod schema: { errorGroups: z.array(...), crashRate: z.number(), stabilityScore: z.number() }',
      'Verify: curl http://localhost:3000/api/stability/bugsnag → { crashRate: number, stabilityScore: number }',
    ],
    time: '2–3 hours',
  },
  {
    id: 'google-play',
    detect: /\b(google.?play|play.?store|android.*(metric|stat|crash|rating))\b/i,
    label: 'Google Play Integration',
    group: 'integration',
    priority: 21,
    packages: ['googleapis'],
    envVars: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_PLAY_PACKAGE_NAME'],
    routes: ['GET /api/stability/play → { rating, installs, crashRate, anrRate, reviewScore }'],
    steps: [
      'npm install googleapis',
      'Create GCP service account with androidpublisher scope — base64-encode JSON key into GOOGLE_SERVICE_ACCOUNT_JSON',
      'Create src/lib/google-play.ts — authenticate JWT from GOOGLE_SERVICE_ACCOUNT_JSON, export androidpublisher client',
      'Create src/services/play.ts — fetchAppStats(), fetchCrashRate(), fetchAnrRate(), fetchRating(), fetchReviews()',
      'Create src/app/api/stability/play/route.ts — GET with next: { revalidate: 300 }, transform to unified StabilityMetric shape',
      'Verify: curl http://localhost:3000/api/stability/play → { rating: number, crashes: number, anrRate: number }',
    ],
    time: '2–3 hours',
  },
  {
    id: 'app-store',
    detect: /\b(app.?store|ios.*(metric|stat|crash)|apple.*dashboard)\b/i,
    label: 'App Store Connect Integration',
    group: 'integration',
    priority: 22,
    packages: ['app-store-connect-api'],
    envVars: ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY', 'ASC_APP_ID'],
    routes: ['GET /api/stability/appstore → { rating, crashes, installations, reviews }'],
    steps: [
      'npm install app-store-connect-api',
      'Generate App Store Connect API key — store ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY in .env',
      'Create src/lib/app-store.ts — JWT auth with ES256, export ascClient()',
      'Create src/services/app-store.ts — fetchCrashInsights(), fetchRatings(), fetchInstalls()',
      'Create src/app/api/stability/appstore/route.ts — GET with 5-min revalidate',
      'Verify: curl http://localhost:3000/api/stability/appstore → { rating, crashes, installations }',
    ],
    time: '2–3 hours',
  },
  {
    id: 'sentry',
    detect: /\b(sentry|error.monitoring)\b/i,
    label: 'Sentry Integration',
    group: 'integration',
    priority: 23,
    packages: ['@sentry/nextjs'],
    envVars: ['SENTRY_DSN', 'SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'],
    routes: ['GET /api/stability/sentry → { issues, errorRate, crashFreeRate }'],
    steps: [
      'npm install @sentry/nextjs && npx @sentry/wizard@latest -i nextjs',
      'Create src/services/sentry.ts — fetchIssues(), fetchErrorRate(), fetchCrashFreeRate() using Sentry API v0',
      'Create src/app/api/stability/sentry/route.ts — GET with Zod validation and caching',
      'Verify: curl http://localhost:3000/api/stability/sentry → { crashFreeRate: number }',
    ],
    time: '1–2 hours',
  },
  {
    id: 'datadog',
    detect: /\b(datadog|data.?dog|dd.?agent)\b/i,
    label: 'Datadog Integration',
    group: 'integration',
    priority: 24,
    packages: ['@datadog/datadog-api-client'],
    envVars: ['DD_API_KEY', 'DD_APP_KEY', 'DD_SITE'],
    routes: ['GET /api/metrics/datadog → { p99Latency, errorRate, requestCount }'],
    steps: [
      'npm install @datadog/datadog-api-client',
      'Create src/lib/datadog.ts — configure client with DD_API_KEY + DD_APP_KEY',
      'Create src/services/datadog.ts — fetchMetrics(), fetchAlerts(), fetchDashboards()',
      'Create src/app/api/metrics/datadog/route.ts — GET with query time range param',
      'Verify: curl "http://localhost:3000/api/metrics/datadog?range=1h" → metrics object',
    ],
    time: '1–2 hours',
  },
  {
    id: 'remote-config',
    detect: /\b(remote.?config|feature.?flag|feature.?toggle|config.?panel|ab.?test|a\/b.?test|experiment)\b/i,
    label: 'Remote Config',
    group: 'data',
    priority: 30,
    packages: [],
    envVars: [],
    dbSchema: [
      'model RemoteConfig {',
      '  id          String   @id @default(cuid())',
      '  key         String   @unique',
      '  value       Json',
      '  valueType   String   // "boolean" | "string" | "number" | "json"',
      '  description String?',
      '  enabled     Boolean  @default(true)',
      '  environment String   @default("production") // "production" | "staging" | "development"',
      '  updatedBy   String',
      '  updatedAt   DateTime @updatedAt',
      '  createdAt   DateTime @default(now())',
      '}',
    ],
    routes: [
      'GET    /api/remote-config            → list all configs',
      'POST   /api/remote-config            → create config',
      'PATCH  /api/remote-config/[key]      → update value or toggle enabled',
      'DELETE /api/remote-config/[key]      → remove config',
      'POST   /api/remote-config/[key]/test → simulate fetch as client',
    ],
    steps: [
      'Add RemoteConfig model to prisma/schema.prisma (key, value Json, valueType, enabled, environment, updatedBy)',
      'npx prisma migrate dev --name add-remote-config',
      'Create src/app/api/remote-config/route.ts — GET list + POST create; Zod schema: { key: z.string(), value: z.unknown(), valueType: z.enum([...]) }',
      'Create src/app/api/remote-config/[key]/route.ts — PATCH (partial update) + DELETE with audit log write',
      'Create src/app/api/remote-config/[key]/test/route.ts — POST returns value as client SDK would return it',
      'Create src/components/remote-config/ConfigTable.tsx — inline edit cells, enabled toggle, Test button that shows modal with simulated response',
      'Verify: POST /api/remote-config { key: "ff_new_ui", value: true, valueType: "boolean" } → 201 with cuid id',
    ],
    time: '3–4 hours',
  },
  {
    id: 'slack-bot',
    detect: /\b(slack.?bot|slack|slash.?command|bot.*pull|bot.*fetch)\b/i,
    label: 'Slack Bot',
    group: 'integration',
    priority: 40,
    packages: ['@slack/bolt', '@slack/web-api'],
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN'],
    slashCommands: ['/stability', '/config', '/status', '/alerts'],
    routes: ['POST /api/slack/events', 'POST /api/slack/commands'],
    steps: [
      'Create Slack app at api.slack.com — enable Socket Mode, Bot Token Scopes: chat:write, commands; add slash commands: /stability, /config, /status, /alerts',
      'npm install @slack/bolt @slack/web-api',
      'Create src/bot/app.ts — App instance with SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET; start() in Socket Mode',
      'Create src/bot/commands/stability.ts — /stability fetches GET /api/stability/bugsnag + /api/stability/play, returns Block Kit card with crash rate + stability score',
      'Create src/bot/commands/config.ts — /config <key> fetches remote config by key, /config list returns paginated table',
      'Create src/bot/commands/status.ts — /status returns overall health summary: green/yellow/red per integration',
      'Create src/app/api/slack/events/route.ts — POST webhook with SLACK_SIGNING_SECRET verification',
      'Verify: /stability in Slack → Block Kit card with { crashRate, stabilityScore } from live API',
    ],
    time: '3–4 hours',
  },
  {
    id: 'discord-bot',
    detect: /\b(discord.?bot|discord)\b/i,
    label: 'Discord Bot',
    group: 'integration',
    priority: 41,
    packages: ['discord.js'],
    envVars: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_CLIENT_ID'],
    steps: [
      'npm install discord.js',
      'Create Discord application at discord.com/developers — enable bot, copy token into DISCORD_BOT_TOKEN',
      'Create src/bot/discord.ts — Client with GatewayIntentBits.Guilds + GuildMessages',
      'Register slash commands: /stability, /config, /status using REST API',
      'Implement interactionCreate handler — route to command handlers',
      'Verify: /stability in Discord → embed with crash rate + stability score',
    ],
    time: '2–3 hours',
  },
  {
    id: 'charts',
    detect: /\b(chart|graph|visual|metric|analytic|dashboard.*graph|graph.*dashboard|recharts|chart\.?js|d3)\b/i,
    label: 'Charts & Metrics Dashboard',
    group: 'ui',
    priority: 50,
    packages: ['recharts'],
    envVars: [],
    steps: [
      'npm install recharts',
      'Create src/components/charts/StabilityTrendChart.tsx — ResponsiveContainer + LineChart of crash rate over 30 days; data from GET /api/stability/bugsnag?range=30d',
      'Create src/components/charts/ErrorGroupsChart.tsx — BarChart of top 10 error groups by occurrence count',
      'Create src/components/charts/PlayStoreChart.tsx — ComposedChart of daily installs (Bar) + crash rate (Line)',
      'Create src/components/charts/MetricsGrid.tsx — 4-card stat grid: stability score, crash rate, ANR rate, store rating; each card has trend arrow',
      'Create src/app/dashboard/page.tsx — async server component; fetches all stability APIs in parallel with Promise.all; assembles MetricsGrid + charts in responsive grid',
      'Verify: /dashboard loads without hydration errors; Recharts renders in client component boundary with "use client"',
    ],
    time: '3–4 hours',
  },
  {
    id: 'themes',
    detect: /\b(theme|arctic|amber|obsidian|dark.?mode|light.?mode|colour|color.?scheme|palette)\b/i,
    label: 'Theme System',
    group: 'ui',
    priority: 51,
    packages: [],
    envVars: [],
    themeNames: ['arctic', 'amber', 'obsidian', 'slate', 'rose', 'forest'],
    steps: [
      'Define 12 CSS variable sets in src/styles/themes.css — one block per theme×mode combination: arctic-light, arctic-dark, amber-light, amber-dark, obsidian-light, obsidian-dark, slate-light, slate-dark, rose-light, rose-dark, forest-light, forest-dark',
      'Each block sets: --bg, --bg-card, --bg-input, --border, --fg, --fg-muted, --accent, --accent-bg, --success, --error',
      'Create src/lib/theme.ts — ThemeId = "arctic-light" | "arctic-dark" | ...; THEMES: Record<ThemeId, { label, mode }>; getSystemTheme(): ThemeId',
      'Create src/components/ThemeProvider.tsx — "use client"; reads localStorage "theme", applies data-theme attr to <html>; exposes useTheme() context with setTheme()',
      'Create src/components/ThemeSelector.tsx — 12-swatch grid; each swatch shows theme accent colour, label; click calls setTheme() + localStorage.setItem()',
      'Add ThemeProvider to src/app/layout.tsx; add suppressHydrationWarning to <html> to prevent flash',
      'Verify: select obsidian-dark → --bg is dark; refresh → theme persists from localStorage',
    ],
    time: '2–3 hours',
  },
  {
    id: 'settings',
    detect: /\b(settings?|studio|user.?info|user.?manage|role|permission|configuration.?panel|api.?key)\b/i,
    label: 'Settings',
    group: 'ui',
    priority: 60,
    packages: [],
    envVars: [],
    dbSchema: [
      'model Studio {',
      '  id        String   @id @default(cuid())',
      '  name      String',
      '  slug      String   @unique',
      '  logoUrl   String?',
      '  members   User[]',
      '  createdAt DateTime @default(now())',
      '}',
      '',
      'enum Role { ADMIN EDITOR VIEWER }',
    ],
    routes: [
      'GET    /api/settings/studios        → list studios',
      'POST   /api/settings/studios        → create studio',
      'PATCH  /api/settings/studios/[id]   → update studio',
      'GET    /api/settings/users          → list users with studio filter',
      'PATCH  /api/settings/users/[id]     → update role or studio',
    ],
    steps: [
      'Add Studio model and Role enum to prisma/schema.prisma; add studioId + role to User model',
      'npx prisma migrate dev --name add-studios-roles',
      'Create src/app/api/settings/studios/route.ts — GET (list) + POST (create); require ADMIN role via auth check',
      'Create src/app/api/settings/users/route.ts — GET with ?studioId filter; PATCH role/studio with Zod validation',
      'Create src/app/settings/layout.tsx — tab navigation: Studios | Users | API Keys | Integrations',
      'Create src/app/settings/studios/page.tsx — StudioCard grid with edit modal',
      'Create src/app/settings/users/page.tsx — UserTable with role badge, studio dropdown, inline role change',
      'Verify: PATCH /api/settings/users/[id] { role: "EDITOR" } → 200; user row updates role badge without reload',
    ],
    time: '3–4 hours',
  },
  {
    id: 'docs',
    detect: /\b(docs?|documentation|wiki|guide|knowledge.?base|mdx|markdown)\b/i,
    label: 'Docs Section',
    group: 'ui',
    priority: 61,
    packages: ['next-mdx-remote', 'gray-matter', 'shiki'],
    envVars: [],
    steps: [
      'npm install next-mdx-remote gray-matter shiki',
      'Create docs/ directory with MDX files: getting-started.mdx, remote-config.mdx, slack-bot.mdx, themes.mdx, api-reference.mdx — each with frontmatter: title, description, order',
      'Create src/lib/docs.ts — getAllDocs() reads docs/*.mdx, parses frontmatter with gray-matter, sorts by order; getDoc(slug) returns content + meta',
      'Create src/app/docs/layout.tsx — sticky sidebar with doc links grouped by section; active link highlight',
      'Create src/app/docs/[slug]/page.tsx — renderRemote(content) with MDX components; syntax highlighting via shiki',
      'Create src/components/docs/DocSearch.tsx — client-side fuzzy search over doc titles + descriptions',
      'Verify: /docs/getting-started renders MDX with <h1> from frontmatter title; code blocks are syntax-highlighted',
    ],
    time: '2–3 hours',
  },
  {
    id: 'notifications',
    detect: /\b(notification|alert|webhook|email|pagerduty|opsgenie)\b/i,
    label: 'Alerts & Notifications',
    group: 'integration',
    priority: 42,
    packages: ['nodemailer', '@sendgrid/mail'],
    envVars: ['SENDGRID_API_KEY', 'ALERT_EMAIL_FROM', 'WEBHOOK_SECRET'],
    routes: ['POST /api/alerts/webhook', 'GET /api/alerts', 'POST /api/alerts/[id]/acknowledge'],
    steps: [
      'npm install @sendgrid/mail',
      'Create src/services/notifications.ts — sendEmail() via SendGrid, sendSlackAlert() via incoming webhook',
      'Create src/app/api/alerts/webhook/route.ts — POST; verify HMAC signature using WEBHOOK_SECRET; parse alert payload; persist to DB + trigger notification',
      'Create src/app/api/alerts/route.ts — GET list with ?status=active|acknowledged filter',
      'Create src/components/alerts/AlertFeed.tsx — real-time feed using SWR with 30s poll interval',
      'Verify: POST /api/alerts/webhook with valid HMAC → 200; alert appears in GET /api/alerts',
    ],
    time: '2–3 hours',
  },
  {
    id: 'caching',
    detect: /\b(redis|cache|memcached)\b/i,
    label: 'Redis Caching',
    group: 'infrastructure',
    priority: 12,
    packages: ['ioredis'],
    envVars: ['REDIS_URL'],
    steps: [
      'npm install ioredis',
      'Create src/lib/redis.ts — IORedis singleton with REDIS_URL; export get(), set(), del() helpers with JSON serialisation',
      'Wrap all external API calls (Bugsnag, Google Play) in cache: check Redis first, fetch + set 5-min TTL on miss',
      'Verify: first call takes ~500ms; second call within TTL takes <10ms from Redis',
    ],
    time: '1–2 hours',
  },
  {
    id: 'stripe',
    detect: /\b(stripe|payment|checkout|subscription|billing|invoice|webhook.*pay|pay.*webhook)\b/i,
    label: 'Stripe Payments',
    group: 'integration',
    priority: 25,
    packages: ['stripe', '@stripe/stripe-js'],
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID'],
    routes: [
      'POST /api/checkout/session  → create Stripe checkout session; returns { url }',
      'POST /api/webhooks/stripe   → verify HMAC, handle payment events',
      'POST /api/billing/portal    → create customer billing portal session',
    ],
    dbSchema: [
      '// Add to User model:',
      '  stripeCustomerId  String?   @unique',
      '  subscriptionId    String?   @unique',
      '  plan              String    @default("free")  // "free" | "pro" | "enterprise"',
      '  planExpiresAt     DateTime?',
    ],
    steps: [
      'npm install stripe @stripe/stripe-js',
      'Create src/lib/stripe.ts — Stripe server client singleton with STRIPE_SECRET_KEY; export stripe',
      'Create src/app/api/checkout/session/route.ts — POST; create checkout session with STRIPE_PRICE_ID; success_url = /billing/success, cancel_url = /billing; return { url }',
      'Create src/app/api/webhooks/stripe/route.ts — POST; stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET); handle: checkout.session.completed → update user plan, invoice.payment_failed → downgrade, customer.subscription.deleted → set plan="free"',
      'Create src/app/api/billing/portal/route.ts — POST; get user stripeCustomerId from DB; create billing portal session; return { url }',
      'Add stripeCustomerId, subscriptionId, plan fields to User model; npx prisma migrate dev --name add-stripe',
      'Verify: POST /api/checkout/session → { url: "https://checkout.stripe.com/..." }; send test event with Stripe CLI → stripe listen --forward-to localhost:3000/api/webhooks/stripe',
    ],
    time: '3–4 hours',
  },
  {
    id: 'firebase',
    detect: /\b(firebase|firestore|realtime.?database|firebase.?auth|fcm|cloud.?messaging|firebase.?storage)\b/i,
    label: 'Firebase Integration',
    group: 'infrastructure',
    priority: 13,
    packages: ['firebase', 'firebase-admin'],
    envVars: [
      'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
      'NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    ],
    steps: [
      'npm install firebase firebase-admin',
      'Create src/lib/firebase-admin.ts — initializeApp() with { credential: cert({ projectId, clientEmail, privateKey }) }; export adminAuth, adminFirestore, adminStorage',
      'Create src/lib/firebase.ts — "use client"; initializeApp() with NEXT_PUBLIC_FIREBASE_* vars; export auth, db (Firestore), storage; use singleton pattern to avoid duplicate init',
      'Create src/services/firebase.ts — typed CRUD wrappers: getDoc<T>(), setDoc<T>(), updateDoc<T>(), deleteDoc(), queryCollection<T>(ref, ...constraints)',
      'Add Firebase Auth middleware to src/middleware.ts — extract Authorization header, adminAuth.verifyIdToken(token), attach uid to request',
      'Create src/hooks/useFirebaseAuth.ts — "use client"; onAuthStateChanged subscription, return { user, loading, signIn, signOut }',
      'Verify: adminAuth.listUsers() → returns UserRecord list; Firestore adminFirestore.collection("_test").add({ts: Date.now()}) → writes document',
    ],
    time: '2–3 hours',
  },
  {
    id: 'supabase',
    detect: /\b(supabase|supabase.?auth|supabase.?storage|supabase.?realtime|supabase.?edge)\b/i,
    label: 'Supabase Integration',
    group: 'infrastructure',
    priority: 14,
    packages: ['@supabase/supabase-js', '@supabase/ssr'],
    envVars: [
      'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    ],
    routes: ['GET /api/auth/callback → exchange OAuth code for session'],
    steps: [
      'npm install @supabase/supabase-js @supabase/ssr',
      'Create src/lib/supabase/client.ts — createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) singleton for client components',
      'Create src/lib/supabase/server.ts — createServerClient() using cookies() from next/headers; export for Server Components and Route Handlers',
      'Create src/lib/supabase/admin.ts — createClient(url, SUPABASE_SERVICE_ROLE_KEY) for admin-only server operations (bypasses RLS)',
      'Create src/app/api/auth/callback/route.ts — GET; exchange code with supabase.auth.exchangeCodeForSession(code); redirect to /dashboard',
      'Update src/middleware.ts — @supabase/ssr createServerClient with request/response cookies; call supabase.auth.getUser() to refresh session on every request',
      'Verify: supabase.auth.getUser() returns user after OAuth; RLS policies enabled in Supabase dashboard → unauthorized reads return empty array',
    ],
    time: '2–3 hours',
  },
  {
    id: 'trpc',
    detect: /\b(trpc|t3.?stack|t3.?app)\b/i,
    label: 'tRPC API Layer',
    group: 'infrastructure',
    priority: 15,
    packages: ['@trpc/server', '@trpc/client', '@trpc/react-query', '@trpc/next', '@tanstack/react-query'],
    envVars: [],
    steps: [
      'npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query',
      'Create src/server/trpc.ts — initTRPC.context<Context>().create(); export publicProcedure, protectedProcedure (middleware: if !ctx.session throw UNAUTHORIZED), router',
      'Create src/server/routers/_app.ts — appRouter with sub-routers; export type AppRouter = typeof appRouter',
      'Create src/app/api/trpc/[trpc]/route.ts — fetchRequestHandler({ router: appRouter, createContext }); export GET, POST',
      'Create src/trpc/client.ts — createTRPCReact<AppRouter>(); httpBatchLink pointing to /api/trpc',
      'Create src/trpc/server.ts — createTRPCContext for SSR with headers(); createCaller(appRouter) for use in Server Components',
      'Wrap src/app/layout.tsx with TRPCReactProvider (QueryClientProvider + trpcClient)',
      'Verify: add healthRouter with publicProcedure.query(() => ({ ok: true, ts: Date.now() })); curl /api/trpc/health → { result: { data: { ok: true } } }',
    ],
    time: '2–3 hours',
  },
  {
    id: 'graphql',
    detect: /\b(graphql|apollo.?server|apollo.?client|graphene|hasura|relay)\b/i,
    label: 'GraphQL API',
    group: 'infrastructure',
    priority: 16,
    packages: ['@apollo/server', '@apollo/client', 'graphql', '@graphql-codegen/cli'],
    envVars: [],
    routes: ['POST /api/graphql → Apollo Server (introspection enabled in dev only)'],
    steps: [
      'npm install @apollo/server @apollo/client graphql && npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-resolvers',
      'Create src/graphql/schema.ts — buildSchema or gql tag; define base Query { health: String } + Mutation type; scalars: DateTime, JSON',
      'Create src/graphql/resolvers.ts — resolver map typed against generated TypeScript types; separate files per domain under src/graphql/resolvers/',
      'Create src/app/api/graphql/route.ts — ApolloServer with typeDefs + resolvers; startServerAndCreateNextHandler; introspection only in dev',
      'Create codegen.yml — schema: ./src/graphql/schema.ts; generates: src/graphql/__generated__/types.ts',
      'Create src/lib/apollo-client.ts — ApolloClient with InMemoryCache + HttpLink to /api/graphql; singleton for SSR with makeVar for reactive variables',
      'Verify: POST /api/graphql { query: "{ health }" } → { data: { health: "ok" } }; codegen generates 0 TS errors',
    ],
    time: '3–4 hours',
  },
  {
    id: 'websockets',
    detect: /\b(websocket|web.?socket|socket\.?io|real.?time|live.?update|sse|server.?sent.?event|push.?notification|event.?stream)\b/i,
    label: 'Real-time WebSockets',
    group: 'integration',
    priority: 43,
    packages: ['socket.io', 'socket.io-client'],
    envVars: [],
    routes: ['GET /api/socket → Socket.IO upgrade handshake'],
    steps: [
      'npm install socket.io socket.io-client',
      'Create server/socket.ts — attach Socket.IO to the same HTTP server; define rooms per resource (e.g. config:{key}); events: connection, disconnect, join-room, leave-room',
      'Create src/lib/socket.ts — "use client"; socket.io-client singleton; connect() / disconnect() helpers; auto-reconnect with { reconnectionDelay: 1000, reconnectionDelayMax: 5000 }',
      'Create src/hooks/useSocket.ts — "use client"; connect on mount, join room(s) based on props, cleanup on unmount; expose emit() and on(event, handler)',
      'Create src/components/RealtimeIndicator.tsx — green dot when socket.connected, gray when disconnected; tooltip with latency',
      'After each DB mutation in API routes, emit targeted event: io.to(`config:${key}`).emit("updated", { key, value, updatedAt })',
      'Verify: open 2 browser tabs at /dashboard; update config in tab 1; tab 2 receives "updated" event in Chrome DevTools WS frame within 100ms',
    ],
    time: '2–3 hours',
  },
  {
    id: 'docker',
    detect: /\b(docker|container|k8s|kubernetes|ci.?cd|github.?action|dockerfile|compose|deploy|production.?build)\b/i,
    label: 'Docker & CI/CD',
    group: 'infrastructure',
    priority: 17,
    packages: [],
    envVars: ['PORT', 'NODE_ENV'],
    steps: [
      'Create Dockerfile — stage 1 (deps): FROM node:20-alpine AS deps; COPY package*.json; npm ci --frozen-lockfile — stage 2 (build): COPY --from=deps . && npm run build — stage 3 (runner): copy .next/standalone + public; EXPOSE 3000',
      'Create .dockerignore — exclude: node_modules, .next, .env*, .git, coverage, *.log',
      'Create docker-compose.yml — services: app (build ., env_file: .env, ports: 3000:3000), db (postgres:16-alpine, volumes: pg-data:/var/lib/postgresql/data), redis (redis:7-alpine)',
      'Create .github/workflows/ci.yml — on: push to main + PRs; jobs: lint (npm run lint), typecheck (npx tsc --noEmit), build (npm run build); cache: node_modules by package-lock hash',
      'Create .github/workflows/deploy.yml — on: tag push v*.*.* ; build + tag + push Docker image to ghcr.io; deploy step via SSH or cloud CLI',
      'Add HEALTHCHECK to Dockerfile: CMD curl -f http://localhost:3000/api/health || exit 1; create src/app/api/health/route.ts — GET returns { ok: true, ts: Date.now() }',
      'Verify: docker compose up --build → app at http://localhost:3000/api/health returns 200; CI workflow triggers on PR and all jobs pass',
    ],
    time: '2–3 hours',
  },
  {
    id: 'queue',
    detect: /\b(queue|job.?queue|background.?job|worker|bullmq|bull\.?mq|task.?queue|cron.?job|async.?job|deferred)\b/i,
    label: 'Background Jobs (BullMQ)',
    group: 'infrastructure',
    priority: 18,
    packages: ['bullmq', 'ioredis'],
    envVars: ['REDIS_URL'],
    steps: [
      'npm install bullmq ioredis',
      'Create src/lib/queues.ts — IORedis connection from REDIS_URL; define named Queues: notificationQueue, reportQueue, emailQueue; export all',
      'Create src/workers/notification.worker.ts — Worker(notificationQueue, async job => { ... }, { connection, concurrency: 5 }); handle job.data typed with Zod; retry: { attempts: 3, backoff: { type: "exponential", delay: 2000 } }',
      'Create src/workers/index.ts — import + start all workers; graceful shutdown on SIGTERM: await Promise.all(workers.map(w => w.close()))',
      'Create src/app/api/jobs/route.ts — POST enqueue job: { type, payload } validated with Zod; GET list jobs by queue + state; DELETE cancel job by id',
      'Add WORKER_ENABLED=true env var; in package.json add "worker": "tsx src/workers/index.ts" script; in docker-compose add worker service with command: npm run worker',
      'Verify: POST /api/jobs { type: "notification", payload: { userId, message } } → 202 { jobId }; GET /api/jobs?jobId={id} → { state: "completed", returnvalue: {...} }',
    ],
    time: '2–3 hours',
  },
  {
    id: 'electron',
    detect: /\b(electron|desktop.?app|native.?app|system.?tray|tray.?icon|menu.?bar|cross.?platform|all.?platform|desktop.*browser|browser.*desktop)\b/i,
    label: 'Electron Desktop Shell',
    group: 'platform',
    priority: 40,
    packages: ['electron', 'electron-builder', 'concurrently', 'wait-on'],
    envVars: [],
    steps: [
      'npm install --save-dev electron electron-builder concurrently wait-on',
      'Create electron/main.ts — BrowserWindow (width: 1200, height: 800, webPreferences: { preload, contextIsolation: true }); app.whenReady(); handle window-all-closed',
      'Create electron/preload.ts — expose safe IPC bridge: contextBridge.exposeInMainWorld("electronAPI", { openFile, onPlaybackEvent, getPlatform })',
      'Add to package.json: "main": "dist-electron/main.js"; scripts: "electron:dev": "concurrently \\"npm run dev\\" \\"wait-on http://localhost:5173 && electron .\\""; "electron:build": "npm run build && electron-builder"',
      'Create electron-builder.config.js — target: mac (dmg), win (nsis), linux (AppImage); appId, productName, directories',
      'Verify: npm run electron:dev → desktop window opens, hot-reload works; npm run electron:build → installer in dist/',
    ],
    time: '2–3 hours',
  },
  {
    id: 'audio',
    detect: /\b(music|audio|playback|media.?player|sound|playlist|track|song|podcast|stream.?audio|howler|tone\.?js|web.?audio)\b/i,
    label: 'Audio Playback Layer',
    group: 'feature',
    priority: 41,
    packages: ['howler', '@types/howler'],
    envVars: [],
    steps: [
      'npm install howler && npm install -D @types/howler',
      'Create src/services/AudioService.ts — platform-agnostic interface: play(url: string), pause(), resume(), stop(), seek(sec: number), setVolume(0–1), getCurrentTime(): number, getDuration(): number, onEnded(cb), onError(cb)',
      'Implement HowlerAdapter: class HowlerAdapter implements AudioService — wraps Howl instance; handles sprite maps for gapless playback',
      'Create src/stores/playerStore.ts — currentTrack, queue: Track[], isPlaying, volume, currentTime, duration; actions: playTrack, enqueue, dequeue, next, prev, shuffle, repeat',
      'Create src/components/PlayerBar.tsx — play/pause button, seek slider (progress via requestAnimationFrame), volume knob, track title + artist, next/prev; wire to playerStore',
      'Create src/components/TrackList.tsx — virtual list (large libraries), row: cover art + title + artist + duration, double-click to play, drag-to-reorder',
      'Verify: play a track → PlayerBar shows title, seek bar advances in real time; skip to next → queue advances correctly',
    ],
    time: '3–4 hours',
  },
  {
    id: 'mobile',
    detect: /\b(mobile|phones?|ios|android|capacitor|react.?native|expo|native.*app|app.*native|all.?platforms?|phones?.*app|app.*phones?)\b/i,
    label: 'Mobile (Capacitor)',
    group: 'platform',
    priority: 42,
    packages: ['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android'],
    envVars: [],
    steps: [
      'npm install @capacitor/core @capacitor/cli && npm install @capacitor/ios @capacitor/android',
      'npx cap init "<AppName>" "com.yourcompany.<appname>" --web-dir dist',
      'Add to capacitor.config.ts: server.url for live-reload in dev, plugins: { SplashScreen, StatusBar }',
      'npm run build → npx cap sync — copies web build + plugins into iOS/Android projects',
      'iOS: npx cap open ios → Xcode opens; set Bundle ID + signing; cmd+R to run on simulator',
      'Android: npx cap open android → Android Studio opens; run on emulator or physical device via USB debug',
      'Add @capacitor/filesystem + @capacitor/media for native file picker and media library access',
      'Verify: npx cap run ios → app launches on simulator; npx cap run android → app launches on emulator; audio plays through native audio stack',
    ],
    time: '2–3 hours',
  },
  {
    id: 'pwa',
    detect: /\b(pwa|progressive.?web|service.?worker|offline.*app|app.*offline|installable|web.?manifest|browser.*app|app.*browser|run.*browser|browser.*platform)\b/i,
    label: 'PWA (Browser — Installable)',
    group: 'platform',
    priority: 43,
    packages: ['vite-plugin-pwa', 'workbox-window'],
    envVars: [],
    steps: [
      'npm install -D vite-plugin-pwa && npm install workbox-window',
      'In vite.config.ts: import VitePWA; add to plugins: VitePWA({ registerType: "autoUpdate", includeAssets: ["favicon.ico","robots.txt"], manifest: { name, short_name, theme_color, icons: [192,512px] } })',
      'Create public/manifest.json — name, short_name, start_url: "/", display: "standalone", background_color, theme_color, icons array',
      'Create src/sw.ts — service worker using workbox-precaching: precacheAndRoute(self.__WB_MANIFEST); add runtime caching for audio files: CacheFirst strategy, maxEntries: 50, maxAgeSeconds: 7 days',
      'In src/main.tsx: import { registerSW } from "virtual:pwa-register"; registerSW({ onNeedRefresh, onOfflineReady })',
      'Add OfflineToast component — shows "Ready to work offline" on first SW install; "Update available" with refresh button on update',
      'Verify: npm run build → dist/ has sw.js + manifest.json; open in Chrome → DevTools Application → SW is registered; Add to Home Screen works on mobile Chrome',
    ],
    time: '1–2 hours',
  },
];

// ── Stack Profiles ────────────────────────────────────────────────────────────

const STACK_PROFILES = {
  nextjs: {
    label: 'Next.js App Router + TypeScript + Tailwind CSS + Prisma + PostgreSQL',
    core: ['Next.js 14', 'React 18', 'TypeScript'],
    styling: ['Tailwind CSS'],
    db: ['PostgreSQL', 'Prisma ORM'],
    packageMgr: 'npm',
    scaffold: 'npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"',
    devCmd: 'npm run dev',
    buildCmd: 'npm run build',
    typecheckCmd: 'npx tsc --noEmit',
    lintCmd: 'npm run lint',
    testCmd: 'npm run test',
    structure: [
      'src/app/          — Next.js App Router pages + API routes',
      'src/components/   — reusable UI components',
      'src/lib/          — singleton clients (db, redis, auth)',
      'src/services/     — external API fetchers',
      'src/hooks/        — custom React hooks',
      'src/styles/       — global CSS + theme variables',
      'src/types/        — shared TypeScript types + Zod schemas',
      'src/bot/          — Slack/Discord bot (if applicable)',
      'prisma/           — Prisma schema + migrations',
      'docs/             — MDX documentation files',
      'public/           — static assets',
    ],
  },

  fastapi: {
    label: 'FastAPI + Python 3.11 + PostgreSQL + SQLAlchemy 2.0 + Alembic',
    core: ['Python 3.11', 'FastAPI 0.110', 'Pydantic v2'],
    styling: [],
    db: ['PostgreSQL', 'SQLAlchemy 2.0', 'Alembic'],
    packageMgr: 'pip',
    scaffold: 'python -m venv venv && source venv/bin/activate && pip install "fastapi[all]" sqlalchemy alembic psycopg2-binary pydantic-settings python-jose[cryptography] python-multipart pytest httpx',
    devCmd: 'uvicorn app.main:app --reload --port 8000',
    buildCmd: 'pip install -r requirements.txt',
    typecheckCmd: 'mypy app/ --ignore-missing-imports',
    lintCmd: 'ruff check app/',
    testCmd: 'pytest -v',
    structure: [
      'app/main.py         — FastAPI app instance, router includes, lifespan events',
      'app/routers/        — route handlers grouped by feature domain',
      'app/models/         — SQLAlchemy ORM models',
      'app/schemas/        — Pydantic v2 request/response models',
      'app/services/       — business logic, external API clients',
      'app/core/           — config (pydantic-settings BaseSettings), security, dependencies',
      'app/database.py     — async SQLAlchemy engine + session factory',
      'alembic/            — Alembic env.py + migration versions/',
      'tests/              — pytest fixtures, unit + integration tests',
      'requirements.txt    — pinned dependencies',
      '.env                — DATABASE_URL, SECRET_KEY, env-specific vars',
    ],
  },
};

// ── Simple task templates (non-NEW_TOOL) ─────────────────────────────────────

const THINKING_HINTS = {
  REFACTOR:            'Think through the full call graph and state flow before writing a single line of code.',
  DEBUG_INVESTIGATION: 'Think through the full call graph and state flow before writing a single line of code.',
  DESIGN_DECISION:     'Think through the full call graph and state flow before writing a single line of code.',
  PERF_OPTIMIZATION:   'Measure before optimizing — do not change any code until you have profiling numbers.',
  BUG_FIX:             'Do not write any fix until you can reproduce the bug with a specific input or test case.',
};

const TASK_TIME = {
  NEW_FEATURE:         '2–4 hours',
  BUG_FIX:             '1–2 hours',
  CODE_REVIEW:         '1 hour',
  REFACTOR:            '2–3 hours',
  DEBUG_INVESTIGATION: '1–2 hours',
  DESIGN_DECISION:     '1 hour',
  PERF_OPTIMIZATION:   '2–3 hours',
  DATA_INTEGRATION:    '2–4 hours',
  DOC_OR_SPEC:         '1–2 hours',
};

// ── Feature extraction ────────────────────────────────────────────────────────

function extractFeatures(input) {
  return FEATURE_REGISTRY
    .filter(f => f.detect.test(input))
    .sort((a, b) => a.priority - b.priority);
}

const PYTHON_DETECT_RE = /\b(fastapi|django|flask|uvicorn|pydantic|sqlalchemy|alembic|celery|pytest|asyncio|python|\.py\b|pip install)\b/i;

function detectInputStack(input) {
  return PYTHON_DETECT_RE.test(input) ? 'fastapi' : 'nextjs';
}

function advisedStack(projectContext, input) {
  // Scanned context takes priority
  if (projectContext?.techStack?.length) {
    const techStr = projectContext.techStack.join(' ').toLowerCase();
    const isPython = /python|fastapi|django|flask/.test(techStr);
    const base = isPython ? STACK_PROFILES.fastapi : STACK_PROFILES.nextjs;
    return {
      ...base,
      core:         projectContext.techStack,
      packageMgr:   projectContext.packageMgr || base.packageMgr,
      devCmd:       projectContext.scripts?.dev       || base.devCmd,
      buildCmd:     projectContext.scripts?.build     || base.buildCmd,
      typecheckCmd: projectContext.scripts?.typecheck || base.typecheckCmd,
      lintCmd:      projectContext.scripts?.lint      || base.lintCmd,
      testCmd:      projectContext.scripts?.test      || base.testCmd,
    };
  }
  // Fall back to input detection
  const profileKey = input ? detectInputStack(input) : 'nextjs';
  return STACK_PROFILES[profileKey];
}

// ── Session builders ──────────────────────────────────────────────────────────

function scaffoldSession(input, features, stack) {
  const pm = stack.packageMgr;
  const hasDB = features.some(f => f.group === 'infrastructure' && f.id === 'database') ||
                features.some(f => f.dbSchema);
  const hasAuth = features.some(f => f.id === 'auth');
  const hasTheme = features.some(f => f.id === 'themes');

  // Electron/Capacitor apps need Vite + React, not Next.js SSR
  const needsVite = features.some(f => f.id === 'electron' || f.id === 'mobile');
  const scaffoldCmd = needsVite
    ? 'npm create vite@latest . -- --template react-ts'
    : stack.scaffold;
  const devUrl = needsVite ? 'http://localhost:5173' : 'http://localhost:3000';

  const steps = [
    scaffoldCmd,
    `${pm} install — verify: ${pm} run dev → ${devUrl} loads`,
  ];

  if (hasDB) {
    steps.push(`${pm} install @prisma/client && ${pm} install -D prisma`);
    steps.push('npx prisma init — set DATABASE_URL=postgresql://user:pass@localhost:5432/appdb in .env');
  }
  if (hasAuth) {
    steps.push(`${pm} install next-auth @auth/prisma-adapter`);
  }
  steps.push('Create src/app/layout.tsx — root layout with sidebar navigation: Dashboard, Config, Settings, Docs');
  steps.push('Create src/components/Sidebar.tsx — nav links, active-link highlight, collapse toggle');
  if (hasTheme) {
    steps.push('Import src/styles/themes.css in layout.tsx — set default data-theme="arctic-dark" on <html>');
  }
  steps.push(`${stack.typecheckCmd} → 0 errors`);

  return {
    label: 'Session 1 — Scaffold & Project Structure',
    content: buildSessionContent({
      context: `Scaffold the project for: ${input.trim().slice(0, 120)}`,
      scope: 'the new project directory only — do not write feature logic yet',
      steps,
      abort: 'scaffold command fails or dev server does not start',
      constraints: [
        'TypeScript strict — no `any`, no non-null assertions without inline comment',
        'Zod at all external data boundaries (API responses, env vars, user input)',
        'No hardcoded credentials — all secrets via process.env + .env file',
        `Run \`${stack.typecheckCmd}\` after every file change`,
      ],
      verification: [`${pm} run dev → ${devUrl} loads with sidebar nav`],
      isLast: false,
      nextSession: 'Session 2',
    }),
    time: '2–3 hours',
    description: `Scaffold ${stack.label.split('+')[0].trim()} project, install core dependencies, create layout with sidebar navigation`,
  };
}

function featureSession(feature, idx, totalSessions, stack, allFeatures, userRules = []) {
  const pm = stack.packageMgr;
  const steps = [...feature.steps];

  // Replace generic npm with project package manager
  const resolvedSteps = steps.map(s => s.replace(/^npm install/g, `${pm} install`));

  const constraints = [
    'TypeScript strict — no `any`, no non-null assertions',
    `Run \`${stack.typecheckCmd}\` after every file change`,
    ...userRules,
  ];

  // Add CLAUDE.md rules if available
  if (feature.id === 'auth') constraints.push('Never store passwords in plaintext — use NextAuth session only');
  if (feature.group === 'integration') constraints.push('Validate all external API responses with Zod before using');
  if (feature.dbSchema) constraints.push('Run `npx prisma migrate dev` — never edit migration files manually');
  if (feature.envVars?.length) {
    constraints.push(`Required env vars: ${feature.envVars.join(', ')} — fail fast if missing using z.string().min(1)`);
  }

  const verification = [];
  if (feature.routes) {
    feature.routes.slice(0, 2).forEach(r => {
      const method = r.split(' ')[0];
      const path = r.split(' ')[1];
      if (method === 'GET') verification.push(`curl http://localhost:3000${path} → non-empty JSON response`);
    });
  }
  verification.push(`${stack.typecheckCmd} → 0 errors`);
  if (stack.testCmd && stack.testCmd !== 'npm run test') verification.push(`${stack.testCmd} → all pass`);

  const isLast = idx === totalSessions - 1;

  return {
    label: `Session ${idx + 1} — ${feature.label}`,
    content: buildSessionContent({
      hint: feature.group === 'integration' ? 'Verify the external API contract with a curl or test call before writing any service logic.' : undefined,
      context: `Implement ${feature.label} — integrate with existing scaffold from Session 1`,
      scope: `only files related to ${feature.label}: ${(feature.routes || []).slice(0, 3).join(', ') || 'src/services, src/app/api, src/components'}`,
      steps: resolvedSteps,
      abort: feature.id === 'remote-config'
        ? 'prisma migrate dev fails — check DATABASE_URL and run npx prisma db push to verify connection'
        : feature.group === 'integration'
        ? `external API returns 401/403 — verify env vars are set; do not hard-code credentials`
        : 'existing TypeScript errors increase — fix before adding more code',
      never: feature.envVars?.length
        ? 'write API keys or secrets directly in source files — always use process.env'
        : 'modify files outside the stated scope without flagging it first',
      constraints,
      verification,
      isLast,
      nextSession: isLast ? null : `Session ${idx + 2}`,
    }),
    time: feature.time || '2–3 hours',
    description: feature.steps[0] || `Implement ${feature.label}`,
  };
}

function buildSessionContent({ hint, context, scope, steps, abort, never, constraints, verification, isLast, nextSession }) {
  const lines = [];
  if (hint) lines.push(hint);
  lines.push(`Context: ${context}`);
  lines.push(`Scope: ONLY modify ${scope}. Flag but do not fix anything outside scope.`);
  lines.push('Steps:');
  steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push('Guardrails:');
  lines.push(`- STOP and report if: ${abort || 'required file does not exist and cannot be located with grep'}`);
  lines.push(`- Never: ${never || 'modify more than 5 files in a single step — decompose first; bypass git hooks with --no-verify'}`);
  lines.push('Constraints:');
  constraints.forEach(c => lines.push(`- ${c}`));
  lines.push('Verification:');
  verification.forEach(v => lines.push(`- ${v}`));
  if (!isLast && nextSession) {
    lines.push('HANDOFF NOTE:');
    lines.push('- Completed: <bullet list of what now works — fill in after session>');
    lines.push('- State: <one sentence describing what the next agent will find>');
    lines.push(`- Next session starts at: ${nextSession}`);
    lines.push('- Caution: <any warnings or known issues for the next agent>');
  }
  return lines.join('\n');
}

// ── SPEC.md + CLAUDE.md generators ───────────────────────────────────────────

function buildSpec(input, features, stack, sessions) {
  const pm = stack.packageMgr;
  const allPackages = [...new Set(features.flatMap(f => f.packages || []))];
  const allEnvVars = [...new Set(features.flatMap(f => f.envVars || []))];
  const allRoutes = [...new Set(features.flatMap(f => f.routes || []))];
  const dbFeatures = features.filter(f => f.dbSchema);

  const lines = [
    '# SPEC.md',
    '',
    '## Purpose',
    input.trim(),
    '',
    '## Tech Stack',
    stack.label,
    '',
    '## Package Manager',
    pm,
    '',
    '## Key Commands',
    `- Install:    \`${pm} install\``,
    `- Dev:        \`${pm} run dev\``,
    `- Build:      \`${pm} run build\``,
    `- Type check: \`${stack.typecheckCmd}\``,
    `- Lint:       \`${stack.lintCmd}\``,
    '',
    '## Directory Structure',
    ...stack.structure.map(l => `  ${l}`),
    '',
  ];

  if (allPackages.length) {
    lines.push('## Dependencies');
    allPackages.forEach(p => lines.push(`- ${p}`));
    lines.push('');
  }

  if (allEnvVars.length) {
    lines.push('## Environment Variables');
    allEnvVars.forEach(v => lines.push(`- \`${v}\`=<value>`));
    lines.push('');
  }

  if (allRoutes.length) {
    lines.push('## API Routes');
    allRoutes.forEach(r => lines.push(`- \`${r}\``));
    lines.push('');
  }

  if (dbFeatures.length) {
    lines.push('## Database Schema (Prisma)');
    dbFeatures.forEach(f => {
      lines.push(`### ${f.label}`);
      lines.push('```prisma');
      (f.dbSchema || []).forEach(l => lines.push(l));
      lines.push('```');
      lines.push('');
    });
  }

  lines.push('## Session Breakdown');
  sessions.forEach((s, i) => {
    lines.push(`### ${s.label}`);
    lines.push(`**Estimated time:** ${s.time}`);
    lines.push(`${s.description}`);
    lines.push('');
  });

  return lines.join('\n');
}

function buildClaudemd(stack) {
  const pm = stack.packageMgr;
  return [
    '# CLAUDE.md',
    '',
    '## Rules',
    '- TypeScript strict — no `any`, no non-null assertions without inline comment',
    '- Zod at all external data boundaries (user input, API responses, env vars, DB rows)',
    '- One concern per session — no mixed refactor + feature work',
    '- Diagnose before mutate — grep/read before editing any file',
    '- No hardcoded credentials — always process.env; never write to .env files from code',
    '- Validate all external API responses with Zod before using in UI or storing',
    '- Run `npx prisma migrate dev` for schema changes — never edit migration files manually',
    '',
    '## Commands',
    `- Install:    ${pm} install`,
    `- Dev:        ${pm} run dev`,
    `- Build:      ${pm} run build`,
    `- Type check: ${stack.typecheckCmd}`,
    `- Lint:       ${stack.lintCmd}`,
    `- DB push:    npx prisma db push`,
    `- DB migrate: npx prisma migrate dev --name <description>`,
    `- DB studio:  npx prisma studio`,
    '',
    '## Commit Convention',
    '- Format: type(scope): description',
    '- Types: feat, fix, refactor, chore, test, docs',
    '- Examples: feat(remote-config): add test endpoint | fix(slack-bot): handle missing env vars',
    '',
    '## Branch Naming',
    '- feature/<short-description>',
    '- fix/<short-description>',
  ].join('\n');
}

// ── Checklist builder ─────────────────────────────────────────────────────────

function buildChecklist(features, stack) {
  const pm = stack.packageMgr;
  const items = [];

  items.push(`${stack.typecheckCmd} → 0 errors`);
  items.push(`${pm} run lint → 0 warnings`);

  if (features.some(f => f.id === 'database' || f.dbSchema)) {
    items.push('npx prisma migrate status → all migrations applied');
    items.push('npx prisma validate → schema is valid');
  }
  if (features.some(f => f.group === 'integration')) {
    items.push('All external API routes return non-empty JSON (curl each GET route)');
  }
  if (features.some(f => f.id === 'remote-config')) {
    items.push('POST /api/remote-config → 201 created; GET /api/remote-config → array with new entry');
  }
  if (features.some(f => f.id === 'slack-bot')) {
    items.push('/stability Slack command → Block Kit card with real crash rate value');
  }
  if (features.some(f => f.id === 'themes')) {
    items.push('Select each of the 12 theme×mode combinations → page repaints correctly; refresh → persists');
  }
  if (features.some(f => f.id === 'charts')) {
    items.push('/dashboard loads without hydration errors; all Recharts components wrapped in "use client"');
  }
  if (features.some(f => f.id === 'docs')) {
    items.push('/docs/getting-started renders MDX with syntax-highlighted code blocks');
  }

  items.push(`${pm} run build → no build errors`);
  items.push('git status → no unintended files staged');

  return items;
}

// ── Title builder ─────────────────────────────────────────────────────────────

function buildTitle(input) {
  // Strip filler verbs, capitalise, trim to nearest word boundary ≤58 chars
  let t = input.trim().replace(/^(build|create|make|add|implement|develop)\s+/i, '').replace(/[.!?]+$/, '').trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 58) {
    // Cut at last space before 55 chars to leave room for '…'
    const cut = t.slice(0, 55).lastIndexOf(' ');
    t = t.slice(0, cut > 20 ? cut : 55) + '…';
  }
  return t;
}

// ── Simple task generators (BUG_FIX, CODE_REVIEW, etc.) ──────────────────────

function buildSimpleTask(input, taskType, projectContext, userRules = []) {
  const stack = advisedStack(projectContext, input);
  const pm = stack.packageMgr;
  const tc = stack.typecheckCmd;

  const SIMPLE = {
    BUG_FIX: {
      hint: 'Do not write any fix until you can reproduce the bug with a specific input or test case.',
      sessions: [{ label: 'Session 1 — Reproduce & Fix', steps: [
        `Reproduce the bug with a specific input or failing test — do not proceed until reproduced`,
        `grep -r '<relevant symbol>' src/ — locate the suspected call site`,
        `Read the suspect file — form a hypothesis before touching any code`,
        `Write a regression test that fails before the fix`,
        `Apply the minimal fix — verify regression test now passes`,
        `${pm} run test → all tests pass including regression`,
      ], abort: 'cannot reproduce after 2 attempts — report reproduction failure, stop', time: '1–2 hours' }],
      checklist: [`${tc} → 0 errors`, `${pm} run test → all tests pass`, 'regression test: fails before fix, passes after fix', 'git status → no unintended files staged'],
    },
    CODE_REVIEW: {
      sessions: [{ label: 'Session 1 — Review', steps: [
        'Read each changed file top to bottom — do not skip any',
        'Classify findings: [BLOCKER] / [MAJOR] / [MINOR] / [NIT] — format: "file:line — description. Suggested fix."',
        'Check security: injection, auth bypass, unvalidated input at boundaries',
        'Check correctness: off-by-one, null handling, race conditions, missing error cases',
        'Check style: naming, dead code, missing tests for new logic',
        'End with "Top 3 Blockers" summary — list in priority order',
      ], abort: 'you cannot read a file — note it as unreviewed, continue with visible files', time: '1 hour' }],
      checklist: ['all changed files reviewed', 'Top 3 Blockers listed', 'security findings classified as BLOCKER or MAJOR'],
    },
    REFACTOR: {
      hint: 'Think through the full call graph before writing a single line of code.',
      sessions: [
        { label: 'Session 1 — Characterization Tests', steps: [
          `${pm} run test → confirm all tests pass BEFORE any change`,
          'Write characterization tests for every public behaviour of the target module',
          `${pm} run test → all characterization tests pass`,
          'STOP — do not modify any implementation code in this session',
        ], abort: 'existing tests fail before you start — fix or report, do not proceed', time: '1–2 hours' },
        { label: 'Session 2 — Apply Refactor', steps: [
          'Read Session 1 HANDOFF NOTE — confirm tests are in place',
          'Apply ONE change type per commit: rename OR extract OR move — never mixed',
          `After each commit: ${pm} run test → must pass before next change`,
          'If any test fails: revert the commit, investigate, then retry',
        ], abort: 'any test fails after a commit — revert before continuing', time: '2–3 hours' },
      ],
      checklist: [`${tc} → 0 errors`, `${pm} run test → all pass`, 'no test regressions vs Session 1 baseline'],
    },
    DEBUG_INVESTIGATION: {
      hint: 'Think through the full call graph and state flow before writing a single line of code.',
      sessions: [{ label: 'Session 1 — Investigate & Report', steps: [
        'State 2–3 hypotheses about the root cause with confidence level',
        'For each hypothesis: design the cheapest confirming test (log, unit test, or grep)',
        'Run tests in confidence order — stop when one is confirmed',
        'Write report: hypothesis → test run → result → conclusion',
        'End with: confirmed root cause + recommended fix session (BUG_FIX type)',
      ], abort: 'you start wanting to fix something — investigation only, save fix for a BUG_FIX session', time: '1–2 hours' }],
      checklist: ['root cause confirmed with a reproducible test or log', 'report written', 'fix recommendation documented'],
    },
    DESIGN_DECISION: {
      hint: 'Think through the full call graph and state flow before writing a single line of code.',
      sessions: [{ label: 'Session 1 — Analyze & Recommend', steps: [
        'Define decision criteria (performance, maintainability, migration cost, team familiarity)',
        'Present 2–3 concrete options — each with pros, cons, and known failure modes',
        'Make a concrete recommendation with 1-sentence rationale — no "it depends" without a decision framework',
        'Estimate migration cost for the chosen option in hours',
        'Output a ready-to-paste implementation prompt for the chosen option',
      ], abort: 'you start writing implementation code — analysis only', time: '1 hour' }],
      checklist: ['2–3 options compared', 'concrete recommendation made', 'implementation prompt ready to paste'],
    },
    PERF_OPTIMIZATION: {
      hint: 'Measure before optimizing — do not change any code until you have profiling numbers.',
      sessions: [
        { label: 'Session 1 — Profile & Measure', steps: [
          'Open DevTools Network + Performance tabs — record baseline numbers before any code change',
          'Identify top 3 bottlenecks by measured impact — not by intuition',
          'STOP — do not edit any code in this session',
          'Write profiling report: metric → baseline number → bottleneck → expected improvement',
        ], abort: 'you start editing code — stop, complete the profiling report first', time: '1–2 hours' },
        { label: 'Session 2 — Fix Bottlenecks', steps: [
          'Read Session 1 profiling report — confirm baseline numbers',
          'Fix bottleneck #1 — measure after: must beat baseline; add before/after to commit message',
          'Fix bottleneck #2 — measure after: must beat baseline',
          'Fix bottleneck #3 — measure after: must beat baseline',
        ], abort: 'a fix does not beat the baseline — investigate before moving to next bottleneck', time: '2–3 hours' },
      ],
      checklist: ['profiling report written with baseline numbers', 'all 3 fixes measured before/after', `${tc} → 0 errors`, `${pm} run build → no errors`],
    },
    DATA_INTEGRATION: {
      sessions: [
        { label: 'Session 1 — Types & Mock UI', steps: [
          `grep -r '<data source name>' src/ — confirm no duplicate integration exists`,
          'Define TypeScript types and Zod schema for the data shape',
          'Create src/mocks/<feature>.ts — realistic mock data matching the Zod schema',
          'Build UI components consuming mock data — add [MOCK] badge when mock is active',
          `${tc} → 0 errors`,
        ], abort: 'you are about to write credentials in any source file — use env vars only', time: '2–3 hours' },
        { label: 'Session 2 — Wire Real API', steps: [
          'Read Session 1 HANDOFF NOTE — confirm mock and types are in place',
          'Add MOCK_MODE env var — when true, use mock; when false, call real API',
          'Implement real API call in service layer — all credentials from process.env',
          'Add loading, error, and empty states to UI components',
          'Remove [MOCK] badge when real data loads successfully',
        ], abort: 'you are about to write credentials in any source file — use env vars only', time: '2–3 hours' },
      ],
      checklist: [`${tc} → 0 errors`, 'MOCK_MODE=true → [MOCK] badge visible', 'MOCK_MODE=false → real data loads', 'git status → no .env files staged'],
    },
    DOC_OR_SPEC: {
      sessions: [{ label: 'Session 1 — Write Documentation', steps: [
        'Read existing source code to extract accurate information — do not invent behaviour',
        'Write Overview section (≤200 words)',
        'Write Quickstart section (runnable example with exact commands)',
        'Write Config section (all env vars with type and default)',
        'Write Troubleshooting section (top 3 failure modes + fixes)',
      ], abort: 'you start editing source files — documentation only', time: '1–2 hours' }],
      checklist: ['all env vars documented', 'quickstart is runnable without modification', 'top 3 failure modes covered'],
    },
    NEW_TOOL: {
      sessions: [
        { label: 'Session 1 — Scaffold & Happy Path', steps: [
          `npm create vite@latest . -- --template react-ts (or npx create-next-app@latest for full-stack)`,
          `${pm} install — verify: ${pm} run dev → app starts on localhost with no errors`,
          'Create entry-point component and confirm it renders before writing any feature logic',
          'Implement the single most critical happy-path flow end-to-end — just enough to prove the concept works',
          `${tc} → 0 errors`,
        ], abort: 'scaffold command fails or entry point does not render', time: '1–2 hours' },
        { label: 'Session 2 — Core Features', steps: [
          'Read Session 1 HANDOFF NOTE — confirm scaffold output files are present',
          'Implement each feature one at a time — do not start the next until the current one has a passing test',
          'Add input validation (Zod) at every user-facing entry point',
          'Add error boundaries and top-3 failure-mode handling',
          `${pm} run test → all pass`,
        ], abort: 'Session 1 output files are missing — re-run Session 1 before continuing', time: '2–4 hours' },
        { label: 'Session 3 — Tests, Polish & Build', steps: [
          'Write unit test for each core feature: minimum 1 happy-path + 1 error-case per feature',
          'Add README.md: purpose, quickstart commands, all env vars with descriptions',
          `${pm} run lint → 0 warnings`,
          `${pm} run build → no errors; output in dist/`,
        ], abort: 'any test added in this session fails — fix before marking complete', time: '1–2 hours' },
      ],
      checklist: [`${tc} → 0 errors`, `${pm} run test → all pass`, `${pm} run build → dist/ created`, 'README has quickstart commands and env var reference'],
    },
    NEW_FEATURE: {
      sessions: [{ label: 'Session 1 — Implement Feature', steps: [
        'Read 2 existing files most similar to what you are about to build — note naming, import style, error-handling patterns before writing anything',
        `grep -r 'existingHook\\|existingService\\|existingComponent' src/ — confirm reusable code to build on`,
        'Implement the feature following existing patterns — introduce no new abstraction if an existing one covers the case',
        'Wire into existing navigation/routing/state — no orphaned components',
        `${pm} run test → no failures`,
      ], abort: 'existing tests break after integration — revert change, investigate, fix before re-applying', time: '2–4 hours' }],
      checklist: [`${tc} → 0 errors`, `${pm} run lint → 0 warnings`, `${pm} run test → all pass`, 'git status → no unintended files staged'],
    },
  };

  const template = SIMPLE[taskType] || SIMPLE.NEW_FEATURE;
  const hint = THINKING_HINTS[taskType];
  const title = buildTitle(input);
  const sessions = template.sessions;
  const total = sessions.length;

  const generatedPrompts = sessions.map((s, i) => {
    const isLast = i === total - 1;
    const lines = [];
    if (hint && i === 0) lines.push(hint);
    lines.push(`Context: ${input.trim()}`);
    lines.push(`Scope: ONLY modify ${
      taskType === 'BUG_FIX' ? 'the minimum files needed to fix the root cause — no refactoring' :
      taskType === 'CODE_REVIEW' ? 'the files under review — do not suggest out-of-scope rewrites' :
      taskType === 'REFACTOR' ? 'explicitly listed files/modules — do not touch callers' :
      taskType === 'DEBUG_INVESTIGATION' ? 'read-only — produce a report, implement nothing' :
      taskType === 'DESIGN_DECISION' ? 'analysis only — no code written' :
      taskType === 'PERF_OPTIMIZATION' ? 'only the measured bottlenecks — no speculative optimization' :
      'files directly required by this task'
    }. Flag but do not fix anything outside scope.`);
    lines.push('Steps:');
    s.steps.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
    lines.push('Guardrails:');
    lines.push(`- STOP and report if: ${s.abort || 'required file does not exist and cannot be located'}`);
    lines.push('- Never: modify more than 5 files for a single step — decompose first; use --no-verify on git hooks');
    lines.push('Constraints:');
    lines.push('- TypeScript strict — no `any`, no non-null assertions without inline comment');
    lines.push(`- Run \`${tc}\` after every file change — fix errors before proceeding`);
    if (projectContext?.rules?.length) {
      projectContext.rules.slice(0, 4).forEach(r => lines.push(`- ${r}`));
    }
    userRules.forEach(r => lines.push(`- ${r}`));
    lines.push('Verification:');
    (template.checklist || [`${tc} → 0 errors`]).forEach(c => lines.push(`- ${c}`));
    if (!isLast) {
      lines.push('HANDOFF NOTE:');
      lines.push('- Completed: <fill in after completing this session>');
      lines.push('- State: <one sentence describing what the next agent will find>');
      lines.push(`- Next session starts at: ${sessions[i + 1]?.label || `Session ${i + 2}`}`);
      lines.push('- Caution: <any warnings for the next agent>');
    }
    return { sessionLabel: s.label, content: lines.join('\n') };
  });

  const generatedPlan = sessions.map((s, i) => ({
    session: i + 1,
    title: s.label.replace(/^Session \d+ — /, ''),
    description: s.steps[0] || s.label,
    estimatedTime: s.time || TASK_TIME[taskType] || '2 hours',
  }));

  return {
    title,
    generatedPrompts,
    generatedFiles: [],
    generatedPlan,
    generatedChecklist: template.checklist || [`${tc} → 0 errors`, 'git status → no unintended files staged'],
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function generateFromScript(input, taskType, projectContext, userRules = []) {
  // Extract features for task types that benefit from multi-session planning
  const MULTI_SESSION_TYPES = ['NEW_TOOL', 'DATA_INTEGRATION', 'NEW_FEATURE'];
  const features = MULTI_SESSION_TYPES.includes(taskType) ? extractFeatures(input) : [];
  const isComplex = features.length >= 2;

  if (!isComplex) {
    return buildSimpleTask(input, taskType || 'NEW_FEATURE', projectContext, userRules);
  }

  // ── Advanced multi-session planning for complex NEW_TOOL tasks ──

  const stack = advisedStack(projectContext, input);
  const title = buildTitle(input);

  // Ensure database session is included if any feature needs a DB schema
  const needsDB = features.some(f => f.dbSchema);
  const hasDBFeature = features.some(f => f.id === 'database');
  const finalFeatures = (needsDB && !hasDBFeature)
    ? [FEATURE_REGISTRY.find(f => f.id === 'database'), ...features].filter(Boolean)
    : features;

  // Build sessions: scaffold first, then one session per feature group
  const featureSessions = finalFeatures.map((feature, i) =>
    featureSession(feature, i + 1, finalFeatures.length + 1, stack, finalFeatures, userRules)
  );

  const scaffold = scaffoldSession(input, finalFeatures, stack);
  const allSessions = [scaffold, ...featureSessions];

  // Mark last session as final (no handoff note)
  const lastIdx = allSessions.length - 1;

  const generatedPrompts = allSessions.map((s, i) => {
    const isLast = i === lastIdx;
    // Re-build content with correct isLast flag for last session
    if (i === 0) {
      // Scaffold session — re-emit with correct isLast
      return {
        id: undefined,
        sessionLabel: s.label,
        content: s.content.replace(
          /HANDOFF NOTE:[\s\S]*$/,
          isLast ? '' : s.content.match(/HANDOFF NOTE:[\s\S]*$/)?.[0] || ''
        ),
      };
    }
    // Feature sessions — strip or keep HANDOFF NOTE
    const feature = finalFeatures[i - 1];
    const rebuilt = featureSession(feature, i, allSessions.length, stack, finalFeatures);
    return { sessionLabel: rebuilt.label, content: rebuilt.content };
  });

  const generatedPlan = allSessions.map((s, i) => ({
    session: i + 1,
    title: s.label.replace(/^Session \d+ — /, ''),
    description: s.description,
    estimatedTime: s.time,
  }));

  const generatedChecklist = buildChecklist(finalFeatures, stack);

  // Files: SPEC.md + CLAUDE.md
  const generatedFiles = [
    { filename: 'SPEC.md',    content: buildSpec(input, finalFeatures, stack, allSessions) },
    { filename: 'CLAUDE.md',  content: buildClaudemd(stack) },
  ];

  return { title, generatedPrompts, generatedFiles, generatedPlan, generatedChecklist };
}
