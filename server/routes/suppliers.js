const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierPayment = require('../models/SupplierPayment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, isActive } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const suppliers = await Supplier.find(query)
      .populate('lastPayment')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Supplier.countDocuments(query);
    
    res.json({
      suppliers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get supplier by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('lastPayment');
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new supplier (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    
    res.status(201).json({
      message: 'Supplier created successfully',
      supplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update supplier (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({
      message: 'Supplier updated successfully',
      supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete supplier (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get supplier payments
router.get('/:id/payments', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, year, month } = req.query;
    
    let query = { supplier: req.params.id };
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);
    
    const payments = await SupplierPayment.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await SupplierPayment.countDocuments(query);
    
    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get supplier payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add payment to supplier (admin only)
router.post('/:id/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    const payment = new SupplierPayment({
      ...req.body,
      supplier: req.params.id,
      createdBy: req.user._id,
      month: new Date(req.body.paymentDate).getMonth() + 1,
      year: new Date(req.body.paymentDate).getFullYear()
    });
    
    await payment.save();
    
    // Update supplier's last payment
    supplier.lastPayment = payment._id;
    await supplier.save();
    
    await payment.populate('createdBy', 'firstName lastName');
    
    res.status(201).json({
      message: 'Payment added successfully',
      payment
    });
  } catch (error) {
    console.error('Add supplier payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get supplier categories
router.get('/meta/categories', authenticateToken, (req, res) => {
  const categories = [
    { value: 'gardener', label: 'גנן', icon: '🌱' },
    { value: 'cleaner', label: 'מנקה', icon: '🧽' },
    { value: 'guest_insurance', label: 'ביטוח אורחים', icon: '🏠' },
    { value: 'elevators', label: 'מעליות', icon: '🛗' },
    { value: 'solar_maintenance', label: 'טיפול דודי שמש', icon: '☀️' },
    { value: 'pumps', label: 'משאבות', icon: '💧' },
    { value: 'maintenance_person', label: 'איש תחזוקה', icon: '🔧' },
    { value: 'bezeq', label: 'בזק', icon: '📞' },
    { value: 'security', label: 'אבטחה', icon: '🛡️' },
    { value: 'electricity', label: 'חשמל', icon: '⚡' },
    { value: 'water', label: 'מים', icon: '🚰' },
    { value: 'gas', label: 'גז', icon: '🔥' },
    { value: 'other', label: 'אחר', icon: '📋' }
  ];
  
  res.json(categories);
});

// Get supplier statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const totalSuppliers = await Supplier.countDocuments({ isActive: true });
    
    const monthlyExpenses = await SupplierPayment.aggregate([
      {
        $match: {
          year: currentYear,
          month: currentMonth,
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const expensesByCategory = await SupplierPayment.aggregate([
      {
        $match: {
          year: currentYear,
          status: 'paid'
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      {
        $unwind: '$supplierInfo'
      },
      {
        $group: {
          _id: '$supplierInfo.category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    res.json({
      totalSuppliers,
      monthlyExpenses: monthlyExpenses[0] || { total: 0, count: 0 },
      expensesByCategory,
      month: currentMonth,
      year: currentYear
    });
  } catch (error) {
    console.error('Supplier stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;