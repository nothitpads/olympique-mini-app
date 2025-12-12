# 🚀 Quick Deploy Commands

## Prerequisites
- [ ] Backend deployed on Render with URL
- [ ] At least one admin user created (`npm run create-admin`)

---

## Option 1: Deploy to Vercel (Recommended)

### Using Vercel CLI (5 minutes)

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Navigate to admin directory
cd admin

# 3. Login to Vercel
vercel login

# 4. Deploy (first time)
vercel

# Follow prompts:
# - Link to existing project? N
# - Project name? olympique-admin
# - In which directory? ./ (current)

# 5. Add environment variable
vercel env add VITE_API_URL production
# When prompted, enter: https://your-backend.onrender.com/api

# 6. Deploy to production
vercel --prod

# 7. Get your admin panel URL
# It will be shown in terminal, e.g.:
# https://olympique-admin.vercel.app
```

### Using Vercel Dashboard (10 minutes)

```bash
# 1. Ensure admin folder is in your Git repo
cd admin
git add .
git commit -m "Add admin panel"
git push

# 2. Go to https://vercel.com/dashboard
# 3. Click "Add New" → "Project"
# 4. Import your repository
# 5. Configure:
#    - Root Directory: admin
#    - Framework: Vite
#    - Build Command: npm run build
#    - Output Directory: dist
# 6. Add Environment Variable:
#    - VITE_API_URL = https://your-backend.onrender.com/api
# 7. Click "Deploy"
```

---

## Option 2: Deploy to Render

```bash
# 1. Create render.yaml in admin directory
cat > admin/render.yaml << EOF
services:
  - type: web
    name: olympique-admin
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        value: https://your-backend.onrender.com/api
EOF

# 2. Push to GitHub
git add admin/render.yaml
git commit -m "Add Render config for admin"
git push

# 3. Go to Render Dashboard
# 4. New → Static Site
# 5. Connect repository
# 6. Root Directory: admin
# 7. Build Command: npm run build
# 8. Publish Directory: dist
# 9. Add Environment Variable: VITE_API_URL
# 10. Create Static Site
```

---

## Update Backend CORS (Required!)

After deploying, update your backend to allow the admin panel:

```bash
# 1. Edit backend/server.js
# Find the CORS configuration and update:

app.use(cors({ 
  origin: [
    'https://your-frontend.vercel.app',        # Your main app
    'https://olympique-admin.vercel.app',      # Your admin panel (update this!)
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}))

# 2. Commit and push
git add backend/server.js
git commit -m "Update CORS for admin panel"
git push

# 3. Render will auto-deploy
# Or manually trigger deploy from Render Dashboard
```

---

## Create First Admin User (If Not Done)

```bash
# SSH into your Render backend or run locally connected to production DB

cd backend
npm run create-admin

# Enter:
# Email: admin@yourdomain.com
# Password: (strong password, min 8 chars)
# First Name: (optional)
# Last Name: (optional)
```

---

## Test Your Deployment

```bash
# 1. Open admin panel URL in browser
# Example: https://olympique-admin.vercel.app

# 2. Try logging in with admin credentials

# 3. Check these work:
# - Dashboard loads with stats
# - Users page shows users
# - Trainers page loads
# - Audit logs display

# 4. Check browser console for any errors
```

---

## Troubleshooting

### Error: "Failed to fetch"
```bash
# Check CORS in backend
# Verify VITE_API_URL is correct
# Check backend is running on Render
```

### Error: "Invalid credentials"
```bash
# Verify admin user exists:
# - Check database directly, OR
# - Try creating admin user again
```

### Error: 404 on admin routes
```bash
# Ensure vercel.json exists in admin folder
# It should have SPA routing rewrites
```

---

## Update Deployment (Future)

```bash
# If using Vercel CLI
cd admin
vercel --prod

# If using GitHub integration
git add .
git commit -m "Update admin panel"
git push
# Auto-deploys on Vercel
```

---

## Environment Variables Reference

### Admin Panel (Vercel)
```
VITE_API_URL=https://your-backend.onrender.com/api
```

### Backend (Render)
```
DATABASE_URL=(already set)
DIRECT_URL=(already set)
JWT_SECRET=(already set)
BOT_TOKEN=(already set)
FATSECRET_CLIENT_ID=(already set)
FATSECRET_CLIENT_SECRET=(already set)

# Optional for admin IP whitelisting
ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8
```

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Render | Free tier | Free |
| Total | | **$0/month** |

---

## Custom Domain (Optional)

```bash
# 1. In Vercel Dashboard
# - Go to Project Settings → Domains
# - Add: admin.yourdomain.com

# 2. Update DNS at your registrar
# - Type: CNAME
# - Name: admin
# - Value: cname.vercel-dns.com

# 3. Update backend CORS to include custom domain

# 4. Wait 5-30 minutes for DNS propagation
```

---

## Success! ✅

Your admin panel is deployed and accessible at:
**https://olympique-admin.vercel.app** (or your custom domain)

You can now:
- ✅ Login with admin credentials
- ✅ Manage users and roles
- ✅ Approve trainers
- ✅ View audit logs
- ✅ Monitor platform statistics

**Next steps:**
1. Share admin URL with your team
2. Create additional admin accounts
3. Set up custom domain (optional)
4. Configure monitoring (optional)

