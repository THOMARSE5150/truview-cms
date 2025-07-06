require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const csrf = require('csurf');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const sgMail = require('@sendgrid/mail');
const Stripe = require('stripe');
const twilio = require('twilio');
const db = require('better-sqlite3')('truview-cms.db');
const axios = require('axios');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-dev-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use(csrf());

app.use((req, res, next) => {
  res.locals.flash = req.flash();
  res.locals.csrfToken = req.csrfToken();
  res.locals.globals = db.prepare('SELECT * FROM global_content').all();
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.'
});

function requireLogin(req, res, next) {
  if (!req.session.isAuthenticated) return res.redirect('/admin/login');
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).send('Forbidden.');
    }
    next();
  };
}

// Dynamic service-location landing pages
app.get('/services/:serviceSlug/:location', (req, res) => {
  const { serviceSlug, location } = req.params;
  const locData = db.prepare('SELECT * FROM locations_content WHERE location = ?').get(location);
  if (!locData) return res.status(404).send('Location not found');

  const serviceData = db.prepare('SELECT * FROM services_content WHERE service_slug = ? AND location_id = ?')
    .get(serviceSlug, locData.id);
  if (!serviceData) return res.status(404).send('Service not found');

  const finalDescription = serviceData.service_description
    .replace(/{{location}}/gi, location)
    .replace(/{{service_name}}/gi, serviceData.service_name);

  res.render('landing', { location, finalDescription, ...serviceData });
});

// Static pages
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));

// Contact form handler with reCAPTCHA
app.post('/contact', express.urlencoded({ extended: true }), async (req, res) => {
  const { name, email, phone, message } = req.body;
  const recaptchaResponse = req.body['g-recaptcha-response'];

  if (!recaptchaResponse) {
    req.flash('error', 'Please complete the reCAPTCHA.');
    return res.redirect('/contact');
  }

  try {
    const recaptchaRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaResponse
      }
    });
    if (!recaptchaRes.data.success) {
      req.flash('error', 'reCAPTCHA verification failed. Please try again.');
      return res.redirect('/contact');
    }
  } catch (err) {
    console.error('reCAPTCHA error:', err);
    req.flash('error', 'reCAPTCHA verification error.');
    return res.redirect('/contact');
  }

  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO contact_submissions (name, email, phone, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, phone, message, timestamp);

  sgMail.send({
    to: 'yourteam@truview.glass',
    from: 'no-reply@truview.glass',
    subject: `New Contact: ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
  }).then(() => console.log('SendGrid: Contact notification sent'))
    .catch(console.error);

  twilioClient.messages.create({
    body: `New contact: ${name}, ${email}, ${phone}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+61XXXXXXXXX' // replace with your real phone number
  }).then(() => console.log('Twilio: SMS alert sent'))
    .catch(console.error);

  req.flash('success', 'Thank you! We’ll reply soon.');
  res.redirect('/contact');
});

// Sitemap
app.get('/sitemap.xml', (req, res) => {
  const services = db.prepare('SELECT sc.service_slug, lc.location FROM services_content sc JOIN locations_content lc ON sc.location_id = lc.id').all();
  const siteUrl = 'https://truview.glass';
  let urls = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  urls += `<url><loc>${siteUrl}/services</loc></url>`;
  services.forEach(s => urls += `<url><loc>${siteUrl}/services/${s.service_slug}/${s.location}</loc></url>`);
  urls += '</urlset>';
  res.header('Content-Type', 'application/xml').send(urls);
});

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', time: new Date() }));

// Stripe webhook
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send('Webhook error');
  }

  const timestamp = Date.now();
  db.prepare(`INSERT INTO billing_events (customer_id, event_type, details, timestamp) VALUES (?, ?, ?, ?)`)
    .run(event.data.object.customer, event.type, JSON.stringify(event.data.object), timestamp);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`Subscription successful for customer ${session.customer}`);
  }

  res.json({ received: true });
});

// Admin routes
app.get('/admin/login', (req, res) => res.render('admin-login'));

app.post('/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    req.session.isAuthenticated = true;
    req.session.user = { id: user.id, username: user.username, role: user.role, stripeCustomerId: user.stripeCustomerId };
    req.flash('success', `Logged in as ${user.username}`);
    return res.redirect('/admin');
  }
  req.flash('error', 'Invalid credentials');
  res.redirect('/admin/login');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ✅ FIXED: Pass user to the EJS template properly
app.get('/admin', requireLogin, (req, res) => {
  res.render('admin-dashboard', {
    user: req.session.user
  });
});

app.get('/admin/contacts', requireLogin, requireRole('manager', 'admin'), (req, res) => {
  const contacts = db.prepare('SELECT * FROM contact_submissions ORDER BY created_at DESC').all();
  res.render('admin-contacts', { contacts });
});

app.get('/admin/billing-events', requireLogin, requireRole('manager', 'admin'), (req, res) => {
  const events = db.prepare('SELECT * FROM billing_events ORDER BY timestamp DESC').all();
  res.render('admin-billing-events', { events });
});

app.get('/admin/billing-analytics', requireLogin, requireRole('manager', 'admin'), (req, res) => {
  const monthlyData = db.prepare(`
    SELECT strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch')) AS month, COUNT(*) AS events
    FROM billing_events
    WHERE event_type = 'checkout.session.completed'
    GROUP BY month
    ORDER BY month ASC
  `).all();
  res.render('admin-billing-analytics', { monthlyData });
});

// 404 fallback
app.use((req, res) => res.status(404).send('Page not found'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TruView CMS running on port ${PORT}`));