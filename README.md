# TruView CMS

A dynamic content management system (CMS) and landing page generator for TruView Glass, built with Node.js, Express, SQLite, and EJS. It includes:

✅ Dynamic landing pages for services & locations  
✅ Full-featured admin dashboard  
✅ Contact form with email + SMS alerts  
✅ Stripe subscription billing  
✅ Webhook-based billing events + dunning support  
✅ Admin analytics & logs  
✅ Ready for SEO, performance optimization, and future image upload features

---

## 🚀 Features

- Dynamic service pages with customizable hero images and location-based content
- Admin login with role-based access
- Contact form protected with Google reCAPTCHA
- SendGrid email and Twilio SMS integration for notifications
- Stripe Checkout integration for recurring subscriptions with trials and discounts
- Stripe webhooks for billing events
- Billing analytics dashboard
- SQLite database with easy setup
- Fully responsive public and admin interfaces
- Modern security best practices (CSRF protection, Helmet, rate limiting)

---

## 📂 Folder Structure
truview-cms/
├── index.js
├── init-db.js
├── package.json
├── README.md
├── /public
│   ├── admin.css
│   ├── site.css
│   ├── your hero images and logos
├── /views
│   ├── landing.ejs
│   ├── admin-*.ejs
│   ├── contact.ejs
│   ├── about.ejs
│   ├── success.ejs
│   ├── cancel.ejs
│   └── partials/
│       ├── header.ejs
│       └── footer.ejs

---

## 🛠️ Setup

1. **Install dependencies**
   ```bash
   npm install

2. Initialize the database
node init-db.js

3. Configure environment variables
Create a .env file with your API keys and secrets (or add them in Railway/hosting platform):

SESSION_SECRET=...
SENDGRID_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
RECAPTCHA_SECRET_KEY=...
HUBSPOT_API_KEY=...
NODE_ENV=production

4. Run the app
npm start

🧪 Testing
	•	Access public pages: /about, /contact, /services/:serviceSlug/:location
	•	Admin panel: /admin/login
	•	Confirm contact form submission and billing flows.

⸻

⚙️ Deployment
	•	Push your repo to GitHub.
	•	Connect it to Railway, Vercel, or your hosting platform.
	•	Add environment variables.
	•	Run node init-db.js on your server once to set up the database.

⸻

📖 License

This project is for TruView Glass. Contact the project owner for licensing details.

⸻

🙌 Credits
	•	Designed and developed by Ben Thomas + OpenAI assistant.# trigger redeploy
# force redeploy

<!-- Trigger redeploy -->
# Trigger redeploy
