const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const { authenticateToken, requireAdmin, requireAdminOrOwner } = require('../middleware/auth');

// Get all payments (admin only) or user's payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, month, year, resident } = req.query;
    
    let query = {};
    
    // If not admin, only show user's own payments
    if (req.user.role !== 'admin') {
      query.resident = req.user._id;
    } else if (resident) {
      query.resident = resident;
    }
    
    // Add filters
    if (status) query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const payments = await Payment.find(query)
      .populate('resident', 'firstName lastName apartment phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Payment.countDocuments(query);
    
    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('resident', 'firstName lastName apartment phone')
      .populate('createdBy', 'firstName lastName');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check if user can access this payment
    if (req.user.role !== 'admin' && payment.resident._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new payment (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      resident,
      amount,
      type,
      description,
      dueDate,
      month,
      year
    } = req.body;
    
    // Validate resident exists
    const residentUser = await User.findById(resident);
    if (!residentUser) {
      return res.status(400).json({ message: 'Resident not found' });
    }
    
    const payment = new Payment({
      resident,
      amount,
      type,
      description,
      dueDate,
      month,
      year,
      createdBy: req.user._id
    });
    
    await payment.save();
    await payment.populate('resident', 'firstName lastName apartment phone');
    
    res.status(201).json({
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && payment.resident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const allowedUpdates = req.user.role === 'admin' 
      ? ['amount', 'type', 'description', 'dueDate', 'status', 'paymentMethod', 'transactionId', 'paidDate', 'notes']
      : ['paymentMethod', 'transactionId', 'notes']; // Residents can only update payment info
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // If marking as paid, set paidDate
    if (updates.status === 'paid' && !updates.paidDate) {
      updates.paidDate = new Date();
    }
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('resident', 'firstName lastName apartment phone');
    
    res.json({
      message: 'Payment updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark payment as paid (with receipt upload)
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check if user can pay this payment
    if (req.user.role !== 'admin' && payment.resident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { paymentMethod, transactionId, receiptUrl } = req.body;
    
    payment.status = 'paid';
    payment.paidDate = new Date();
    payment.paymentMethod = paymentMethod;
    payment.transactionId = transactionId;
    
    if (receiptUrl) {
      payment.receipt = {
        url: receiptUrl,
        uploadedAt: new Date()
      };
    }
    
    await payment.save();
    await payment.populate('resident', 'firstName lastName apartment phone');
    
    res.json({
      message: 'Payment marked as paid',
      payment
    });
  } catch (error) {
    console.error('Pay payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete payment (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const stats = await Payment.aggregate([
      {
        $match: {
          year: currentYear,
          month: currentMonth
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const overdue = await Payment.countDocuments({
      status: 'pending',
      dueDate: { $lt: new Date() }
    });
    
    res.json({
      stats,
      overdue,
      month: currentMonth,
      year: currentYear
    });
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create bulk payments for all residents (admin only)
router.post('/bulk/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { amount, type, description, dueDate, month, year } = req.body;
    
    // Get all active residents
    const residents = await User.find({ role: 'resident', isActive: true });
    
    const payments = residents.map(resident => ({
      resident: resident._id,
      amount,
      type,
      description,
      dueDate,
      month,
      year,
      createdBy: req.user._id
    }));
    
    const createdPayments = await Payment.insertMany(payments);
    
    res.status(201).json({
      message: `Created ${createdPayments.length} payments successfully`,
      count: createdPayments.length
    });
  } catch (error) {
    console.error('Bulk create payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;