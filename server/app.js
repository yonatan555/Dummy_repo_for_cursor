require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const supplierRoutes = require('./routes/suppliers');
const maintenanceRoutes = require('./routes/maintenance');

// Import services
const notificationService = require('./services/notificationService');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Dashboard endpoint
app.get('/api/dashboard', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const User = require('./models/User');
    const Payment = require('./models/Payment');
    const Maintenance = require('./models/Maintenance');
    const Supplier = require('./models/Supplier');
    const Notification = require('./models/Notification');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Different dashboard data based on user role
    if (req.user.role === 'admin') {
      // Admin dashboard
      const totalResidents = await User.countDocuments({ role: 'resident', isActive: true });
      const totalSuppliers = await Supplier.countDocuments({ isActive: true });
      
      const paymentStats = await Payment.aggregate([
        {
          $match: { month: currentMonth, year: currentYear }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const maintenanceStats = await Maintenance.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const overduePayments = await Payment.countDocuments({
        status: 'pending',
        dueDate: { $lt: new Date() }
      });

      const recentMaintenanceRequests = await Maintenance.find()
        .populate('reportedBy', 'firstName lastName apartment')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        role: 'admin',
        stats: {
          totalResidents,
          totalSuppliers,
          overduePayments,
          paymentStats,
          maintenanceStats
        },
        recentMaintenanceRequests
      });
    } else {
      // Resident dashboard
      const userPayments = await Payment.find({ resident: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5);

      const userMaintenanceRequests = await Maintenance.find({ reportedBy: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5);

      const notifications = await notificationService.getUserNotifications(req.user._id, 1, 5);

      const pendingPayments = await Payment.countDocuments({
        resident: req.user._id,
        status: 'pending'
      });

      res.json({
        role: 'resident',
        stats: {
          pendingPayments,
          unreadNotifications: notifications.unreadCount
        },
        recentPayments: userPayments,
        recentMaintenanceRequests: userMaintenanceRequests,
        recentNotifications: notifications.notifications
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Notifications routes
app.get('/api/notifications', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const notifications = await notificationService.getUserNotifications(req.user._id, page, limit);
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.json(notification);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send announcement (admin only)
app.post('/api/announcements', require('./middleware/auth').authenticateToken, require('./middleware/auth').requireAdmin, async (req, res) => {
  try {
    const { title, message, targetRole = 'resident' } = req.body;
    const notifications = await notificationService.sendGeneralAnnouncement(title, message, targetRole);
    res.json({
      message: 'Announcement sent successfully',
      count: notifications.length
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// File upload endpoint (placeholder - integrate with Cloudinary or similar)
app.post('/api/upload', require('./middleware/auth').authenticateToken, (req, res) => {
  // TODO: Implement file upload with Cloudinary
  res.json({ 
    message: 'File upload endpoint - to be implemented with Cloudinary',
    url: 'https://example.com/placeholder.jpg'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Building Management System API is ready!');
});

module.exports = app;