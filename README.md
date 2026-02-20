# THUNDERFIRE Shopify App

Connect your Shopify store to THUNDERFIRE autonomous node management. Monitor manufacturing quality, warehouse robots, delivery drones, and IoT sensors — all from your Shopify admin.

## For Shopify Merchants

Install from the [Shopify App Store](https://apps.shopify.com/thunderfire) (coming soon).

## Features

- **Fleet Dashboard** — View all connected THUNDERFIRE nodes with health status
- **Node Detail** — 7-field CHITRAL health breakdown per node
- **Product Binding** — Link Shopify products to monitoring nodes
- **Auto-Goals** — Automatically send THETA goals when orders are placed
- **NOP Marketplace** — Browse and track service contracts
- **Storefront Widget** — Show real-time node health on product pages
- **Alerts** — Get notified when node health degrades

## For Developers

### Prerequisites

- Node.js 20+
- Shopify Partner account
- Shopify CLI (`npm install -g @shopify/cli`)

### Setup

```bash
# Clone the repository
git clone https://github.com/mayayai/tf-shopify.git
cd tf-shopify

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SHOPIFY_API_KEY` — From Shopify Partner Dashboard
- `SHOPIFY_API_SECRET` — From Shopify Partner Dashboard
- `SHOPIFY_APP_URL` — Your app's public URL
- `DATABASE_URL` — Database connection string

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## File Structure

```
tf-shopify/
├── app/
│   ├── routes/              # Remix routes
│   │   ├── app._index.tsx   # Fleet dashboard
│   │   ├── app.nodes.$id.tsx# Node detail
│   │   ├── app.settings.tsx # API configuration
│   │   ├── app.bind.tsx     # Product binding
│   │   ├── app.services.tsx # NOP marketplace
│   │   ├── app.contracts.tsx# Active contracts
│   │   ├── app.alerts.tsx   # Alert history
│   │   └── webhooks.tsx     # Shopify webhooks
│   ├── components/          # Polaris components
│   ├── lib/                 # Utilities
│   │   ├── thunderfire-client.ts
│   │   ├── billing.ts
│   │   └── shopify-*.ts
│   └── shopify.server.ts    # Shopify app config
├── extensions/
│   └── tf-storefront/       # Theme App Extension
├── prisma/
│   └── schema.prisma        # Database schema
├── tests/                   # Test suite
└── shopify.app.toml         # Shopify app config
```

## Deployment

### Fly.io (Recommended)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Deploy
fly deploy
```

### Docker

```bash
docker build -t tf-shopify .
docker run -p 3000:3000 tf-shopify
```

### Other Platforms

The app runs on any Node.js hosting platform:
- Vercel
- Railway
- Render
- Heroku

## Shopify App Store Submission

1. Create app in [Shopify Partner Dashboard](https://partners.shopify.com)
2. Configure app URLs
3. Run `shopify app deploy` to push extensions
4. Create app listing with screenshots
5. Submit for review (2-10 business days)

### Review Checklist

- [ ] OAuth flow works correctly
- [ ] GDPR webhooks respond with 200
- [ ] Billing uses Shopify Billing API
- [ ] Polaris design system used throughout
- [ ] Theme App Extension (no ScriptTag)
- [ ] CSP headers present
- [ ] Lighthouse impact < 10 points
- [ ] External Service disclosure in listing

## Plans

| Feature | Free | Pro ($29/mo) |
|---------|------|--------------|
| View nodes | Up to 3 | Unlimited |
| Health monitoring | Yes | Yes |
| Send commands/goals | No | Yes |
| Product binding | No | Yes |
| Order auto-goals | No | Yes |
| NOP marketplace | View only | Full access |

## External Services

This app connects to THUNDERFIRE TOP API to retrieve node data. See our [Privacy Policy](https://mayayai.com/privacy) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`npm test`)
5. Submit a pull request

## License

MIT License — See [LICENSE](LICENSE) for details.
