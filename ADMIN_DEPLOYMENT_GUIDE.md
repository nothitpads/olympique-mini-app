# 🚀 Admin Panel Deployment Guide

Your setup:
- ✅ **Telegram Mini App Frontend**: Vercel
- ✅ **Backend API**: Render
- ❓ **Admin Panel**: To be deployed

---

## 📋 Deployment Options

### **Option 1: Deploy Admin Panel to Vercel** (Recommended) ⭐

**Pros:**
- ✅ Same platform as your frontend
- ✅ Fast global CDN
- ✅ Zero-config deployment
- ✅ Free for personal projects
- ✅ Automatic HTTPS

**Cons:**
- ⚠️ Separate domain from backend

---

### **Option 2: Deploy Admin Panel to Render** (Alternative)

**Pros:**
- ✅ Same platform as backend
- ✅ Can be on same domain
- ✅ Simple static site hosting

**Cons:**
- ⚠️ Slower than Vercel's CDN
- ⚠️ May need paid plan

---

### **Option 3: Serve from Backend** (Not Recommended)

**Pros:**
- ✅ Single deployment
- ✅ Same origin (no CORS)

**Cons:**
- ⚠️ Backend server resources used for static files
- ⚠️ Slower than CDN
- ⚠️ More complex deployment

---

## 🎯 RECOMMENDED: Deploy to Vercel

### Step 1: Prepare Admin Panel for Production

#### 1.1 Update Environment Variable

Create `admin/.env.production`:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

Replace `your-backend.onrender.com` with your actual Render backend URL.

#### 1.2 Update `package.json` (Optional - for better optimization)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 2: Build Locally (Test)

```bash
cd admin
npm run build
```

This creates a `dist/` folder. Test it locally:

```bash
npm run preview
```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI (Fastest)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy from admin directory:**
```bash
cd admin
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? **Y**
   - Which scope? **Your account**
   - Link to existing project? **N**
   - Project name? **olympique-admin**
   - In which directory is your code? **./admin**
   - Override settings? **N**

5. **Set Environment Variable:**
```bash
vercel env add VITE_API_URL
```
Enter: `https://your-backend.onrender.com/api`

6. **Deploy to Production:**
```bash
vercel --prod
```

#### Option B: Using Vercel Dashboard (Easier)

1. **Push admin folder to GitHub:**

Create a new repository or add to existing:
```bash
git add admin/
git commit -m "Add admin panel"
git push
```

2. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Click "Add New" → "Project"
   - Import your GitHub repository

3. **Configure Project:**
   - **Framework Preset**: Vite
   - **Root Directory**: `admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variable:**
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-backend.onrender.com/api`
   - Apply to: Production, Preview, Development

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment (1-2 minutes)
   - Get your URL: `olympique-admin.vercel.app`

---

## 🔧 Update Backend CORS for Admin Panel

Your backend needs to allow requests from the admin panel domain.

### Update `backend/server.js`:

```javascript
const cors = require('cors')

// Update CORS configuration
app.use(cors({ 
  origin: [
    'https://your-frontend.vercel.app',        // Your main app
    'https://olympique-admin.vercel.app',      // Your admin panel
    'http://localhost:5173',                    // Local development
    'http://localhost:3000'                     // Local development
  ],
  credentials: true
}))
```

**Then redeploy your backend on Render.**

---

## 🔐 Security Considerations

### 1. Custom Domain (Recommended)

Instead of `olympique-admin.vercel.app`, use:
- `admin.olympique.app` or
- `dashboard.olympique.app`

**In Vercel:**
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 2. IP Whitelisting (Optional - Extra Security)

For maximum security, you can restrict admin access by IP:

**In backend middleware (backend/server.js):**

```javascript
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',') || []

function ipWhitelist(req, res, next) {
  if (ADMIN_ALLOWED_IPS.length === 0) {
    return next() // Skip if not configured
  }
  
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  
  if (!ADMIN_ALLOWED_IPS.includes(clientIp)) {
    return res.status(403).json({ error: 'IP not allowed' })
  }
  
  next()
}

// Apply to admin routes
app.use('/api/admin/*', ipWhitelist)
```

Add to Render environment variables:
```
ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8
```

### 3. Rate Limiting

Already implemented in backend! Admin routes have rate limiting.

---

## 📝 Complete Deployment Checklist

### Backend (Render)
- [ ] Update CORS to include admin panel URL
- [ ] Verify `JWT_SECRET` is set
- [ ] Verify `DATABASE_URL` is set
- [ ] (Optional) Add `ADMIN_ALLOWED_IPS` for IP whitelisting
- [ ] Redeploy backend

### Admin Panel (Vercel)
- [ ] Set `VITE_API_URL` environment variable
- [ ] Build passes successfully
- [ ] Deploy to production
- [ ] Test login functionality
- [ ] (Optional) Add custom domain

### Database
- [ ] At least one admin user created
- [ ] Database accessible from backend

### Testing
- [ ] Can access admin panel URL
- [ ] Can login with admin credentials
- [ ] Can view dashboard
- [ ] Can manage users
- [ ] Can approve trainers
- [ ] Can view audit logs

---

## 🎯 Quick Deploy Commands

### If using Vercel CLI:

```bash
# 1. Navigate to admin
cd admin

# 2. Install Vercel CLI (if not installed)
npm install -g vercel

# 3. Login
vercel login

# 4. Deploy
vercel

# 5. Set environment variable
vercel env add VITE_API_URL production
# Enter: https://your-backend.onrender.com/api

# 6. Deploy to production
vercel --prod
```

**Done! Your admin panel is live!** 🎉

---

## 🔄 Update Deployment (Future Changes)

### Auto-Deploy (GitHub Integration)
If you connected Vercel to GitHub:
- Every push to main branch = auto-deploy
- Preview deployments for PRs

### Manual Deploy
```bash
cd admin
vercel --prod
```

### Update Environment Variables
```bash
vercel env add VITE_API_URL production
```

Or via Vercel Dashboard: Settings → Environment Variables

---

## 🌐 Production URLs Structure

After deployment, you'll have:

```
Main App:       https://olympique.vercel.app
Admin Panel:    https://olympique-admin.vercel.app (or admin.olympique.app)
Backend API:    https://your-backend.onrender.com
Database:       Neon PostgreSQL
```

---

## 🐛 Troubleshooting Production Issues

### Issue 1: "Failed to fetch" errors
**Cause:** CORS not configured
**Solution:** Update backend CORS to include admin panel URL

### Issue 2: "Invalid credentials" on login
**Cause:** Admin user doesn't exist or wrong password
**Solution:** Create admin user:
```bash
cd backend
npm run create-admin
```

### Issue 3: 404 on admin routes
**Cause:** Vercel SPA routing not configured
**Solution:** Create `admin/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Then redeploy.

### Issue 4: Environment variables not working
**Cause:** VITE_ prefix required for Vite
**Solution:** Ensure variable is `VITE_API_URL` (not `API_URL`)

### Issue 5: "Network Error"
**Cause:** Backend not accessible or wrong URL
**Solution:** 
1. Check backend is running on Render
2. Verify `VITE_API_URL` is correct
3. Check browser console for exact error

---

## 💰 Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Admin) | Hobby | **$0/month** |
| Render (Backend) | Free/Starter | **$0-7/month** |
| Neon (Database) | Free | **$0/month** |
| **Total** | | **$0-7/month** |

All on free tier = **$0/month!** 🎉

---

## 🎨 Custom Domain Setup (Optional)

### 1. Buy Domain
- Namecheap, GoDaddy, Cloudflare, etc.
- Example: `olympique.app`

### 2. Add to Vercel
**For Admin Panel:**
1. Vercel Dashboard → Project → Settings → Domains
2. Add: `admin.olympique.app`
3. Copy DNS records shown

### 3. Update DNS
Add these records to your domain provider:

```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

### 4. Wait for Propagation
Usually 5-30 minutes

### 5. Update Backend CORS
```javascript
app.use(cors({ 
  origin: [
    'https://olympique.app',           // Main app
    'https://admin.olympique.app',     // Admin panel
    // ... other origins
  ]
}))
```

---

## 🔒 Production Security Checklist

- [ ] HTTPS enabled (automatic on Vercel)
- [ ] CORS properly configured
- [ ] Strong admin passwords (min 8 chars)
- [ ] JWT_SECRET is strong and secret
- [ ] Admin panel on separate subdomain
- [ ] Rate limiting enabled (already implemented)
- [ ] Audit logging enabled (already implemented)
- [ ] (Optional) IP whitelisting configured
- [ ] (Optional) 2FA for admin accounts (future enhancement)

---

## 📊 Monitoring Your Admin Panel

### Vercel Analytics (Free)
1. Go to Vercel Dashboard
2. Enable Analytics
3. View traffic, performance, errors

### Backend Monitoring (Render)
1. Render Dashboard → Your service
2. View logs, metrics, deployments

### Database Monitoring (Neon)
1. Neon Console
2. View queries, connections, storage

---

## 🚀 You're Ready to Deploy!

**Recommended approach:**

1. **Deploy admin panel to Vercel** (5 minutes)
2. **Update backend CORS** (2 minutes)
3. **Create first admin user** (1 minute)
4. **Test everything** (5 minutes)

**Total time: ~15 minutes**

---

## 📞 Need Help?

Common commands:
```bash
# Deploy to Vercel
cd admin && vercel --prod

# View logs
vercel logs

# Check environment variables
vercel env ls

# Rollback deployment
vercel rollback
```

**Status**: 📋 Ready to deploy!
**Recommended**: ⭐ Vercel deployment (easiest, fastest)

