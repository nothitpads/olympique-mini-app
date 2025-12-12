# Olympique Admin Panel

Web-based admin panel for managing the Olympique fitness app.

## Features

- 📊 **Dashboard** - Platform statistics and activity overview
- 👥 **User Management** - View, edit roles, and manage users
- 💪 **Trainer Approvals** - Review and approve trainer applications
- 📝 **Audit Logs** - Track all admin actions and changes
- 🔐 **Secure Authentication** - Email/password login with JWT tokens

## Tech Stack

- React 18
- Vite
- React Router v6
- Modern CSS (no framework dependencies)

## Setup

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Configure Environment

Create a `.env` file in the `admin` directory:

```env
VITE_API_URL=http://localhost:4000/api
```

For production, update this to your backend URL.

### 3. Create First Admin User

Before you can login, you need to create an admin user in the database.

From the **backend** directory, run:

```bash
cd ../backend
node scripts/create-admin.js
```

Follow the prompts to enter:
- Email address
- Password (min 8 characters)
- First name (optional)
- Last name (optional)

### 4. Start Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploying

### Option 1: Static Hosting (Vercel, Netlify, etc.)

1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variable: `VITE_API_URL=https://your-api.com/api`

### Option 2: Same Server as Backend

You can serve the admin panel from your backend server:

1. Build the admin panel
2. Copy the `dist` folder to your backend
3. Add a route in your backend to serve the static files

Example (Express):

```javascript
app.use('/admin', express.static(path.join(__dirname, '../admin/dist')))
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **HTTPS Only** - Always use HTTPS in production
2. **Strong Passwords** - Enforce strong password requirements
3. **Rate Limiting** - Admin routes have rate limiting in the backend
4. **JWT Expiry** - Admin tokens expire after 8 hours
5. **Audit Logging** - All admin actions are logged
6. **IP Whitelisting** - Consider restricting admin access to specific IPs

## Default Credentials

There are no default credentials. You must create an admin user using the `create-admin.js` script.

## Admin Routes

| Route | Description |
|-------|-------------|
| `/login` | Admin login page |
| `/dashboard` | Platform statistics overview |
| `/users` | User management and role changes |
| `/trainers` | Pending trainer approval queue |
| `/audit` | Audit log viewer |

## API Integration

The admin panel communicates with your backend API. Ensure your backend has:

- ✅ Admin authentication endpoints (`/api/auth/admin/login`)
- ✅ Admin-only middleware (`adminOnly`)
- ✅ Admin API routes (`/api/admin/*`)
- ✅ CORS configured for the admin panel origin

## Troubleshooting

### Can't Login
- Verify admin user exists in database with `role = 'admin'`
- Check that `VITE_API_URL` points to the correct backend
- Ensure backend is running and accessible

### CORS Errors
- Add admin panel URL to backend CORS configuration
- For development: `http://localhost:5173`

### 403 Forbidden
- Verify user has `admin` role in database
- Check JWT token is being sent with requests
- Review backend logs for authorization errors

## Development

### Project Structure

```
admin/
├── src/
│   ├── components/      # Reusable UI components
│   │   └── Layout.jsx
│   ├── context/         # React context providers
│   │   └── AuthContext.jsx
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── Trainers.jsx
│   │   └── AuditLogs.jsx
│   ├── services/        # API service layer
│   │   └── api.js
│   ├── styles/          # CSS files
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
└── package.json
```

### Adding New Features

1. Create new page in `src/pages/`
2. Add corresponding CSS in `src/styles/`
3. Add route in `src/App.jsx`
4. Add navigation link in `src/components/Layout.jsx`

## License

Proprietary - Olympique Fitness App
