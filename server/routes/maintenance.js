const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all maintenance requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category, reportedBy } = req.query;
    
    let query = {};
    
    // If not admin, only show user's own reports or assigned tasks
    if (req.user.role !== 'admin') {
      query.$or = [
        { reportedBy: req.user._id },
        { assignedTo: req.user._id }
      ];
    } else {
      if (reportedBy) query.reportedBy = reportedBy;
    }
    
    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    
    const maintenanceRequests = await Maintenance.find(query)
      .populate('reportedBy', 'firstName lastName apartment phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('supplier', 'name category phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Maintenance.countDocuments(query);
    
    res.json({
      maintenanceRequests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get maintenance request by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('reportedBy', 'firstName lastName apartment phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('supplier', 'name category phone')
      .populate('updates.updatedBy', 'firstName lastName');
    
    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    
    // Check if user can access this maintenance request
    if (req.user.role !== 'admin' && 
        maintenance.reportedBy._id.toString() !== req.user._id.toString() &&
        (!maintenance.assignedTo || maintenance.assignedTo._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(maintenance);
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new maintenance request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const maintenance = new Maintenance({
      ...req.body,
      reportedBy: req.user._id
    });
    
    await maintenance.save();
    await maintenance.populate('reportedBy', 'firstName lastName apartment phone');
    
    res.status(201).json({
      message: 'Maintenance request created successfully',
      maintenance
    });
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update maintenance request
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    
    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    
    // Check permissions
    const canUpdate = req.user.role === 'admin' || 
                     maintenance.reportedBy.toString() === req.user._id.toString() ||
                     (maintenance.assignedTo && maintenance.assignedTo.toString() === req.user._id.toString());
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Different allowed updates based on role
    let allowedUpdates = [];
    if (req.user.role === 'admin') {
      allowedUpdates = ['title', 'description', 'category', 'priority', 'status', 'assignedTo', 'supplier', 'estimatedCost', 'actualCost', 'scheduledDate', 'completedDate', 'notes'];
    } else if (maintenance.reportedBy.toString() === req.user._id.toString()) {
      allowedUpdates = ['title', 'description', 'category', 'priority', 'notes'];
    } else if (maintenance.assignedTo && maintenance.assignedTo.toString() === req.user._id.toString()) {
      allowedUpdates = ['status', 'notes', 'actualCost', 'completedDate'];
    }
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // If marking as completed, set completedDate
    if (updates.status === 'resolved' && !updates.completedDate) {
      updates.completedDate = new Date();
    }
    
    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('reportedBy', 'firstName lastName apartment phone')
     .populate('assignedTo', 'firstName lastName')
     .populate('supplier', 'name category phone');
    
    res.json({
      message: 'Maintenance request updated successfully',
      maintenance: updatedMaintenance
    });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add update to maintenance request
router.post('/:id/updates', authenticateToken, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    
    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    
    // Check permissions
    const canUpdate = req.user.role === 'admin' || 
                     maintenance.reportedBy.toString() === req.user._id.toString() ||
                     (maintenance.assignedTo && maintenance.assignedTo.toString() === req.user._id.toString());
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const update = {
      message: req.body.message,
      updatedBy: req.user._id,
      status: req.body.status || maintenance.status
    };
    
    maintenance.updates.push(update);
    
    // Update status if provided
    if (req.body.status) {
      maintenance.status = req.body.status;
      
      if (req.body.status === 'resolved') {
        maintenance.completedDate = new Date();
      }
    }
    
    await maintenance.save();
    await maintenance.populate('updates.updatedBy', 'firstName lastName');
    
    res.json({
      message: 'Update added successfully',
      maintenance
    });
  } catch (error) {
    console.error('Add maintenance update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete maintenance request (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const maintenance = await Maintenance.findByIdAndDelete(req.params.id);
    
    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    
    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get maintenance statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Maintenance.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const priorityStats = await Maintenance.aggregate([
      {
        $match: { status: { $in: ['open', 'in_progress'] } }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const categoryStats = await Maintenance.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgCost: { $avg: '$actualCost' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const recentRequests = await Maintenance.find()
      .populate('reportedBy', 'firstName lastName apartment')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      stats,
      priorityStats,
      categoryStats,
      recentRequests
    });
  } catch (error) {
    console.error('Maintenance stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get maintenance categories
router.get('/meta/categories', authenticateToken, (req, res) => {
  const categories = [
    { value: 'plumbing', label: 'אינסטלציה', icon: '🚿' },
    { value: 'electrical', label: 'חשמל', icon: '⚡' },
    { value: 'elevator', label: 'מעלית', icon: '🛗' },
    { value: 'cleaning', label: 'ניקיון', icon: '🧽' },
    { value: 'gardening', label: 'גינון', icon: '🌱' },
    { value: 'security', label: 'אבטחה', icon: '🛡️' },
    { value: 'painting', label: 'צביעה', icon: '🎨' },
    { value: 'general', label: 'כללי', icon: '🔧' },
    { value: 'emergency', label: 'חירום', icon: '🚨' }
  ];
  
  res.json(categories);
});

module.exports = router;