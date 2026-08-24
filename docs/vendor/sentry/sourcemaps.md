Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/
Fetched: 2026-08-24

---

# Source Maps | Sentry for Next.js

Source maps translate minified production code back to your original source, giving you readable stack traces instead of cryptic line numbers.

**The SDK handles this automatically.** When you run `next build`, source maps are generated and uploaded to Sentry. No extra configuration needed if you used the [Sentry Wizard](https://docs.sentry.io/platforms/javascript/guides/nextjs/#step-1-install).

Source maps are only uploaded during **production builds** (`next build`). Development builds (`next dev`) don't generate uploads.

**Deploying with Vercel?** You can also use the [Vercel integration](https://docs.sentry.io/integrations/deployment/vercel/) for automatic uploads during deployment.

## Manual Configuration

If you installed the SDK manually or the wizard didn't complete, configure source map uploads:

### Add Auth Token

Add your Sentry auth token to your environment. Make sure to also add it to your CI.

```bash
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
```

### Configure Next.js

Add `withSentryConfig` to your Next.js config with your org, project, and auth token.

With **Turbopack** (Next.js 15+ default), source maps upload after the build completes.

Requires `@sentry/nextjs@10.13.0+` and `next@15.4.1+`.

```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // your existing Next.js config
};

export default withSentryConfig(nextConfig, {
  org: "<your-org-slug>",
  project: "<your-project-slug>",
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
```

## Common Options

| Option                                   | Default | Description                                                                                               |
| ---------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `sourcemaps.deleteSourcemapsAfterUpload` | `true`  | Delete **client-side** source maps after upload. Server source maps are kept for runtime error reporting. |
| `widenClientFileUpload`                  | `false` | Upload dependency source maps to fix `[native code]` frames                                               |

See [Build Options](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/#source-maps-options) for all available options.

## Using Webpack?

If you're using Webpack instead of Turbopack, source maps are uploaded **during** the build (not after). The configuration is the same, but you have additional options:

* **Post-build upload mode:** Set `useRunAfterProductionCompileHook: true` to upload after build (requires Next.js 15.4.1+)
* **Advanced plugin options:** Use `webpack.unstable_sentryWebpackPluginOptions` to pass options to the Sentry Webpack Plugin

See [Webpack Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/webpack-setup/#source-map-upload) for complete Webpack configuration.

## Troubleshooting

If stack traces show minified code, check that `SENTRY_AUTH_TOKEN` is set in your CI environment.

See [Troubleshooting Source Maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/) for detailed debugging steps.

## Additional Resources

* [Using sentry-cli to Upload Source Maps](https://docs.sentry.io/cli/releases/#sentry-cli-sourcemaps)
* [4 Reasons Why Your Source Maps Are Broken](https://blog.sentry.io/2018/10/18/4-reasons-why-your-source-maps-are-broken)

## Pages in this section

- [Troubleshooting Source Maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/)
