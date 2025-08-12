import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Payment as PaymentIcon,
  Build as BuildIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axios from 'axios';

const AdminDashboard = () => {
  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    'adminDashboard',
    () => axios.get('/api/dashboard').then(res => res.data),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  if (isLoading) {
    return <Typography>טוען...</Typography>;
  }

  const { stats, recentMaintenanceRequests } = dashboardData || {};

  // Prepare data for charts
  const paymentStatusData = stats?.paymentStats?.map(stat => ({
    name: getStatusText(stat._id),
    value: stat.count,
    amount: stat.totalAmount
  })) || [];

  const maintenanceStatusData = stats?.maintenanceStats?.map(stat => ({
    name: getMaintenanceStatusText(stat._id),
    value: stat.count
  })) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        דשבורד ניהול
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="דיירים"
            value={stats?.totalResidents || 0}
            icon={<PeopleIcon />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="ספקים"
            value={stats?.totalSuppliers || 0}
            icon={<BusinessIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="תשלומים באיחור"
            value={stats?.overduePayments || 0}
            icon={<WarningIcon />}
            color="#ff5722"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="תחזוקות פעילות"
            value={stats?.maintenanceStats?.find(s => s._id === 'open')?.count || 0}
            icon={<BuildIcon />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Payment Status Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                סטטוס תשלומים החודש
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Maintenance Status Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                סטטוס תחזוקות
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Maintenance Requests */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                בקשות תחזוקה אחרונות
              </Typography>
              <List>
                {recentMaintenanceRequests?.map((request) => (
                  <ListItem key={request._id} divider>
                    <ListItemIcon>
                      <BuildIcon color={getPriorityColor(request.priority)} />
                    </ListItemIcon>
                    <ListItemText
                      primary={request.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            מדווח על ידי: {request.reportedBy?.firstName} {request.reportedBy?.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            דירה: {request.reportedBy?.apartment?.number || 'לא צוין'}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box>
                      <Chip
                        label={getMaintenanceStatusText(request.status)}
                        color={getStatusChipColor(request.status)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={getPriorityText(request.priority)}
                        color={getPriorityChipColor(request.priority)}
                        size="small"
                      />
                    </Box>
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
      </Grid>
    </Box>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
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
const getStatusText = (status) => {
  const statusMap = {
    pending: 'ממתין',
    paid: 'שולם',
    overdue: 'באיחור',
    partial: 'חלקי'
  };
  return statusMap[status] || status;
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

const getPriorityText = (priority) => {
  const priorityMap = {
    low: 'נמוך',
    medium: 'בינוני',
    high: 'גבוה',
    urgent: 'דחוף'
  };
  return priorityMap[priority] || priority;
};

const getPriorityColor = (priority) => {
  const colorMap = {
    low: 'action',
    medium: 'primary',
    high: 'warning',
    urgent: 'error'
  };
  return colorMap[priority] || 'action';
};

const getStatusChipColor = (status) => {
  const colorMap = {
    open: 'primary',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'default',
    cancelled: 'error'
  };
  return colorMap[status] || 'default';
};

const getPriorityChipColor = (priority) => {
  const colorMap = {
    low: 'default',
    medium: 'primary',
    high: 'warning',
    urgent: 'error'
  };
  return colorMap[priority] || 'default';
};

export default AdminDashboard;