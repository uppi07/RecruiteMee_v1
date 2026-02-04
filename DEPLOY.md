# 🚀 Deployment Guide - RecruiteMee v1

Complete guide to deploy the full-stack recruitment platform.

---

## Architecture

- **Frontend:** React + Vite → Vercel
- **Backend:** Node.js + Express → Render/Railway
- **Database:** MongoDB Atlas
- **File Storage:** GridFS or Local uploads

---

## Prerequisites

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
2. [Vercel](https://vercel.com) account (frontend)
3. [Render](https://render.com) account (backend)
4. Payment gateway keys (optional):
   - Razorpay account
   - Stripe account

---

## Step 1: Setup MongoDB Atlas

1. Create free cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create database user with read/write access
3. Get connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/recruitemee
   ```
4. Whitelist all IPs: `0.0.0.0/0` (or specific Render IPs)

---

## Step 2: Deploy Backend (Render)

### Option A: Render Dashboard (Easiest)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect GitHub repo: `uppi07/RecruiteMee_v1`
4. Configure:
   - **Name:** `recruitemee-backend`
   - **Root Directory:** `Server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-mongodb-uri>
   JWT_SECRET=<generate-with-openssl-rand-base64-32>
   FRONTEND_URL=https://your-frontend.vercel.app
   USE_GRIDFS=1
   ```
6. Click **Create Web Service**
7. Copy your backend URL: `https://recruitemee-backend.onrender.com`

### Option B: Docker Deployment

```bash
cd Server

# Build
docker build -t recruitemee-backend .

# Run locally
docker run -p 5000:5000 \
  --env-file .env \
  recruitemee-backend

# Deploy to any Docker host (Railway, Fly.io, AWS, etc.)
```

---

## Step 3: Deploy Frontend (Vercel)

### Option A: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import `uppi07/RecruiteMee_v1`
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `Client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://recruitemee-backend.onrender.com
   ```
5. Click **Deploy**
6. Your frontend is live! `https://recruitemee.vercel.app`

### Option B: Vercel CLI

```bash
cd Client

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variable
vercel env add VITE_API_URL production

# Deploy to production
vercel --prod
```

---

## Step 4: Configure CORS

Update backend `FRONTEND_URL` to match your Vercel deployment:

```env
FRONTEND_URL=https://recruitemee.vercel.app
```

Redeploy backend after updating.

---

## Step 5: Optional - Payment Integration

### Razorpay
1. Sign up at [Razorpay](https://razorpay.com)
2. Get API keys from Dashboard
3. Add to backend environment:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_SECRET=...
   ```

### Stripe
1. Sign up at [Stripe](https://stripe.com)
2. Get API keys
3. Add to backend:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

---

## Step 6: Email Configuration (Optional)

For nodemailer (Gmail example):

1. Enable 2-factor auth on Gmail
2. Generate App Password
3. Add to backend:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

---

## 🧪 Local Development

### Backend
```bash
cd Server
npm install
cp .env.example .env
# Edit .env with your values
npm run dev  # requires nodemon: npm i -D nodemon
```

### Frontend
```bash
cd Client
npm install
cp .env.example .env
# Edit .env with backend URL
npm run dev
```

Visit: http://localhost:5173

---

## 📊 Post-Deployment Testing

### Test Backend
```bash
# Health check
curl https://recruitemee-backend.onrender.com/health

# Test auth endpoint
curl -X POST https://recruitemee-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'
```

### Test Frontend
1. Visit your Vercel URL
2. Check browser console for API errors
3. Test registration/login flow
4. Verify file uploads work

---

## 🐛 Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` matches exactly (no trailing slash)
- Check Render logs for CORS configuration

### MongoDB Connection Failed
- Verify connection string format
- Check IP whitelist in MongoDB Atlas
- Ensure user has proper permissions

### File Upload Issues
- If using GridFS: Ensure `USE_GRIDFS=1`
- If using local storage: Not recommended for Render (ephemeral storage)
- Consider AWS S3 or Cloudinary for production

### Payment Errors
- Use test keys during development
- Verify webhook URLs are configured
- Check payment gateway logs

---

## ✅ Production Checklist

**Backend:**
- [x] MongoDB Atlas configured
- [x] Environment variables set
- [x] CORS configured
- [x] Dockerfile ready
- [x] Health check endpoint
- [ ] Payment gateways configured (optional)
- [ ] Email service configured (optional)
- [ ] Error monitoring (Sentry, etc.)

**Frontend:**
- [x] Vercel configuration
- [x] API URL environment variable
- [x] Build optimization
- [ ] Custom domain (optional)
- [ ] Analytics (Google Analytics, etc.)

---

## 🚀 Going Live

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Update CORS settings
4. ✅ Test all features
5. Add custom domain (optional)
6. Setup monitoring and backups
7. Load test with realistic traffic

---

## 📈 Scaling Tips

- **Database:** MongoDB Atlas has auto-scaling
- **Backend:** Render can scale vertically (upgrade plan)
- **Frontend:** Vercel scales automatically
- **File Storage:** Move to S3/Cloudinary for better performance
- **Caching:** Add Redis for sessions/caching

---

**🎉 Your recruitment platform is live!**

**Live URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`
