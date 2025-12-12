# ⚡ Admin Panel - Quick Start

Get your admin panel running in 5 minutes!

## 📋 Checklist

### ✅ Step 1: Create Admin User (2 min)
```bash
cd backend
npm run create-admin
```
Enter your credentials when prompted.

### ✅ Step 2: Start Backend (30 sec)
```bash
cd backend
npm run dev
```
Should see: `Backend started on 4000`

### ✅ Step 3: Setup Admin Panel (1 min)
```bash
cd admin
npm install
```

### ✅ Step 4: Start Admin Panel (30 sec)
```bash
npm run dev
```
Should see: `Local: http://localhost:5173`

### ✅ Step 5: Login! (30 sec)
1. Open browser to `http://localhost:5173`
2. Login with credentials from Step 1
3. You're in! 🎉

---

## 🎯 First Actions

### Create Another Admin
1. Go to Dashboard
2. Click Users in sidebar
3. Find your test user
4. Change role to "admin"

### Approve a Trainer
1. Click Trainers in sidebar
2. Review pending applications
3. Click "Approve" or "Reject"

### View Activity
1. Click Audit in sidebar
2. See all logged actions
3. Filter by admin or action type

---

## 🐛 Quick Troubleshooting

### Can't create admin user?
- Check backend database connection
- Verify `DATABASE_URL` in backend/.env
- Make sure migrations are applied

### Can't login?
- Verify admin user was created successfully
- Check backend is running on port 4000
- Open browser console for errors

### 404 on API calls?
- Check `VITE_API_URL` in admin/.env
- Should be: `http://localhost:4000/api`
- Restart admin dev server after changing .env

### CORS errors?
Backend CORS is set to `origin: true` (allows all) in development.
For production, update `backend/server.js`:
```javascript
app.use(cors({ origin: ['https://admin.yourdomain.com'] }))
```

---

## 🚀 You're All Set!

The admin panel includes:
- ✅ User management
- ✅ Role changes
- ✅ Trainer approvals
- ✅ Audit logging
- ✅ Platform statistics

### Next Steps:
1. Explore all features
2. Test role changes
3. Approve/reject trainers
4. Review audit logs
5. Plan for production deployment

---

## 📚 Need More Info?

- **Full Setup Guide**: See `ADMIN_SETUP_GUIDE.md`
- **Architecture Overview**: See `README_ADMIN_OVERVIEW.md`
- **Frontend Docs**: See `admin/README.md`

---

## 💡 Pro Tips

1. **Bookmark the login page** for quick access
2. **Create multiple admin accounts** for team members
3. **Check audit logs regularly** to monitor activity
4. **Use search and filters** in the Users page
5. **Review trainer profiles carefully** before approving

---

## ⚠️ Security Reminders

- ✅ Use strong passwords (min 8 characters)
- ✅ Never commit `.env` files
- ✅ Use HTTPS in production
- ✅ Review audit logs regularly
- ✅ Limit admin accounts to trusted team members

---

**Estimated Setup Time**: 5 minutes
**Difficulty**: Easy
**Prerequisites**: Node.js, running backend
**Result**: Full-featured admin panel 🎉

