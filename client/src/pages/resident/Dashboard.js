import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Build as BuildIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResidentDashboard = () => {
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    'residentDashboard',
    () => axios.get('/api/dashboard').then(res => res.data),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  if (isLoading) {
    return <Typography>טוען...</Typography>;
  }

  const { stats, recentPayments, recentMaintenanceRequests, recentNotifications } = dashboardData || {};

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        ברוכים הבאים לאזור האישי
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title="תשלומים ממתינים"
            value={stats?.pendingPayments || 0}
            icon={<PaymentIcon />}
            color="#ff9800"
            onClick={() => navigate('/payments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title="התראות שלא נקראו"
            value={stats?.unreadNotifications || 0}
            icon={<NotificationsIcon />}
            color="#2196f3"
            onClick={() => navigate('/notifications')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title="בקשות תחזוקה פעילות"
            value={recentMaintenanceRequests?.filter(r => r.status === 'open' || r.status === 'in_progress').length || 0}
            icon={<BuildIcon />}
            color="#4caf50"
            onClick={() => navigate('/maintenance')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Payments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  תשלומים אחרונים
                </Typography>
                <Button size="small" onClick={() => navigate('/payments')}>
                  צפה בכל התשלומים
                </Button>
              </Box>
              <List>
                {recentPayments?.map((payment) => (
                  <ListItem key={payment._id} divider>
                    <ListItemIcon>
                      <PaymentIcon color={payment.status === 'paid' ? 'success' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`₪${payment.amount.toLocaleString()}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {payment.description || 'דמי ועד בית'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            תאריך יעד: {new Date(payment.dueDate).toLocaleDateString('he-IL')}
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip
                      label={getPaymentStatusText(payment.status)}
                      color={getPaymentStatusColor(payment.status)}
                      size="small"
                    />
                  </ListItem>
                )) || (
                  <ListItem>
                    <ListItemText primary="אין תשלומים אחרונים" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Maintenance Requests */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  בקשות תחזוקה אחרונות
                </Typography>
                <Button size="small" onClick={() => navigate('/maintenance')}>
                  צפה בכל הבקשות
                </Button>
              </Box>
              <List>
                {recentMaintenanceRequests?.map((request) => (
                  <ListItem key={request._id} divider>
                    <ListItemIcon>
                      <BuildIcon color={getMaintenanceStatusColor(request.status)} />
                    </ListItemIcon>
                    <ListItemText
                      primary={request.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {request.description?.substring(0, 50)}...
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(request.createdAt).toLocaleDateString('he-IL')}
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip
                      label={getMaintenanceStatusText(request.status)}
                      color={getMaintenanceStatusChipColor(request.status)}
                      size="small"
                    />
                  </ListItem>
                )) || (
                  <ListItem>
                    <ListItemText primary="אין בקשות תחזוקה אחרונות" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Notifications */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  התראות אחרונות
                </Typography>
                <Button size="small" onClick={() => navigate('/notifications')}>
                  צפה בכל ההתראות
                </Button>
              </Box>
              <List>
                {recentNotifications?.map((notification) => (
                  <ListItem key={notification._id} divider>
                    <ListItemIcon>
                      <NotificationsIcon color={notification.channels.inApp.read ? 'action' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {notification.message?.substring(0, 100)}...
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(notification.createdAt).toLocaleDateString('he-IL')}
                          </Typography>
                        </Box>
                      }
                    />
                    {!notification.channels.inApp.read && (
                      <Chip label="חדש" color="primary" size="small" />
                    )}
                  </ListItem>
                )) || (
                  <ListItem>
                    <ListItemText primary="אין התראות אחרונות" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color, onClick }) => (
  <Card sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h3" component="h2" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Helper functions
const getPaymentStatusText = (status) => {
  const statusMap = {
    pending: 'ממתין',
    paid: 'שולם',
    overdue: 'באיחור',
    partial: 'חלקי'
  };
  return statusMap[status] || status;
};

const getPaymentStatusColor = (status) => {
  const colorMap = {
    pending: 'warning',
    paid: 'success',
    overdue: 'error',
    partial: 'info'
  };
  return colorMap[status] || 'default';
};

const getMaintenanceStatusText = (status) => {
  const statusMap = {
    open: 'פתוח',
    in_progress: 'בטיפול',
    resolved: 'נפתר',
    closed: 'סגור',
    cancelled: 'בוטל'
  };
  return statusMap[status] || status;
};

const getMaintenanceStatusColor = (status) => {
  const colorMap = {
    open: 'warning',
    in_progress: 'info',
    resolved: 'success',
    closed: 'action',
    cancelled: 'error'
  };
  return colorMap[status] || 'action';
};

const getMaintenanceStatusChipColor = (status) => {
  const colorMap = {
    open: 'warning',
    in_progress: 'info',
    resolved: 'success',
    closed: 'default',
    cancelled: 'error'
  };
  return colorMap[status] || 'default';
};

export default ResidentDashboard;