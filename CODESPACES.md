# GitHub Codespaces Setup

This guide explains how to develop GeoID Pro in GitHub Codespaces.

## Quick Start

1. **Open in Codespaces**
   - Click the "Code" button on the GitHub repository
   - Select "Codespaces" tab
   - Click "Create codespace on main" (or your preferred branch)

2. **Configure Secrets**
   
   Before running the app, configure the following repository secrets in Codespaces settings:
   
   Required secrets:
   - `DATABASE_URL` - PostgreSQL connection string for Drizzle ORM
   - `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL (client-side)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key (client-side)
   - `OPENAI_API_KEY` - OpenAI API key for rock identification (server-side)
   - `GOOGLE_MAPS_API_KEY` - Google Maps API key for location features (server-side)
   
   To add secrets:
   - Go to your repository Settings → Secrets and variables → Codespaces
   - Click "New repository secret"
   - Add each secret with its value

3. **Wait for Setup**
   
   The devcontainer will automatically:
   - Set up Node.js 22 environment
   - Install all dependencies via `npm install`
   - Configure VS Code with ESLint and Prettier extensions
   - Forward ports 5000 (Express) and 8081 (Expo)

4. **Start Development**
   
   Once the setup completes, start the development servers:
   
   ```bash
   npm run dev
   ```
   
   This will start both:
   - Express backend on port 5000
   - Expo dev server on port 8081
   
   Alternatively, run them separately:
   
   ```bash
   # Terminal 1: Start backend
   npm run server:dev
   
   # Terminal 2: Start Expo
   npm run expo:dev
   ```

## Port Forwarding

Codespaces automatically forwards these ports:
- **Port 5000**: Express API server
- **Port 8081**: Expo development server

You can access these via the forwarded URLs in the format:
```
https://{CODESPACE_NAME}-{PORT}.app.github.dev
```

## Environment Variables

The following environment variables are available in the Codespaces environment:
- `CODESPACE_NAME` - The name of your codespace
- `NODE_ENV` - Set to "development" by default

For client-side Expo environment variables, prefix them with `EXPO_PUBLIC_`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DOMAIN` (optional, for custom API endpoint)

## Testing on Mobile Device

To test the app on your mobile device:

1. Ensure your Expo dev server is running (`npm run expo:dev`)
2. Find the forwarded URL for port 8081 in the Ports panel
3. Install Expo Go on your mobile device
4. Scan the QR code shown in the terminal or enter the URL manually in Expo Go

## Available Scripts

- `npm run dev` - Start both server and Expo (parallel)
- `npm start` - Alias for `npm run dev`
- `npm run server:dev` - Start Express backend only
- `npm run expo:dev` - Start Expo dev server only
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run check:types` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run db:push` - Push database schema changes (Drizzle)

## Troubleshooting

### Dependencies Not Installing
If `npm install` fails during setup:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
If a port is already in use, you may need to stop the running process and restart the development servers.

### Environment Variables Not Loading
- Verify secrets are added in repository Codespaces settings
- Rebuild the codespace to pick up new secrets
- For Expo client variables, ensure they're prefixed with `EXPO_PUBLIC_`

### Expo QR Code Not Scanning
- Use the forwarded URL directly in Expo Go instead of scanning
- Make sure port 8081 visibility is set to "Public" in the Ports panel

## Database Setup

If you need to set up the database schema:

```bash
npm run db:push
```

This will push the Drizzle schema to your PostgreSQL database using the `DATABASE_URL` secret.

## Additional Resources

- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Expo Documentation](https://docs.expo.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
