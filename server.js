const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const bannerRoutes = require('./routes/banners');
const commentRoutes = require('./routes/comments');
const videoRoutes = require('./routes/video');
const gamesRoutes = require('./routes/games');
const winnersRoutes = require('./routes/winners');
const jackpotRoutes = require('./routes/jackpot');
const metricsRoutes = require('./routes/metrics');
const otpRoutes = require('./routes/otp');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://www.luckytaj.com'] : true,
    credentials: true
}));

// Rate limiting - More lenient for auth endpoints
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // increased to 50 login attempts per 5 minutes for admin panel
    message: { error: 'Too many login attempts, please try again in 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiting - more lenient
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // increased from 100 to 500 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply specific rate limiting to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve favicon files
app.use('/luckytaj-favicon', express.static(path.join(__dirname, 'luckytaj-favicon')));
app.use('/favicon', express.static(path.join(__dirname, 'favicon')));

// Serve admin panel static files
app.use('/admin', express.static(path.join(__dirname, 'admin-panel')));

// Serve test files
app.use('/tests', express.static(path.join(__dirname, 'tests')));

// Serve documentation
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Serve main frontend files
app.use(express.static(__dirname, { 
    ignore: ['node_modules', 'admin-panel', 'uploads', 'models', 'routes', 'middleware', 'scripts', 'tests', 'docs', 'temp']
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/luckytaj-admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 5000,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    console.log('Server will continue without MongoDB connection');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/videos', videoRoutes); // Add direct /api/videos route for easy access
app.use('/api/games', gamesRoutes);
app.use('/api/winners', winnersRoutes);
app.use('/api/jackpot', jackpotRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/otp', otpRoutes);

// Serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'index.html'));
});

// Serve admin video management page
app.get('/admin/videos', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'videos.html'));
});

// Serve tournament TV management page
app.get('/admin/tournament-tv', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'tournament-tv.html'));
});

// Serve main frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`Admin backend server running on port ${PORT}`);
    console.log(`Admin panel available at: http://localhost:${PORT}/admin`);
    console.log(`API endpoints available at: http://localhost:${PORT}/api/`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});