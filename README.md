# מערכת ניהול ואחזקת מבנים

מערכת מקיפה לניהול ואחזקת מבנים הכוללת ניהול תשלומים, תחזוקה, ספקים והודעות אוטומטיות.

## תכונות עיקריות

### 🏠 ניהול מבנים
- מערכת משתמשים עם הרשאות (אדמינים ודיירים)
- ניהול פרופילים ופרטי דירות
- אבטחה מתקדמת עם JWT

### 💰 ניהול תשלומים
- יצירת תשלומים חודשיים אוטומטית
- מעקב סטטוס תשלומים (ממתין, שולם, באיחור)
- אינטגרציה עם מערכות תשלום (Bit, PayBox, העברות בנק)
- העלאת אסמכתות תשלום
- דוחות תשלומים מפורטים

### 🔧 מערכת תחזוקה
- דיווח תקלות עם תמונות ותיאור
- מעקב סטטוס תקלות
- הקצאת משימות לטכנאים
- מערכת עדכונים והתראות
- תחזוקה מונעת ומתוכננת

### 🏢 ניהול ספקים
- רשימת ספקים מסודרת לפי קטגוריות
- מעקב תשלומים לספקים
- ניהול חוזים ופרטי קשר
- תיעוד עבודות וחשבוניות

### 📱 מערכת התראות
- הודעות WhatsApp אוטומטיות
- תזכורות תשלום ב-15 לכל חודש
- התראות על תקלות ועדכונים
- הודעות כלליות לדיירים
- לוח מודעות דיגיטלי

### 📊 דשבורדים ודוחות
- דשבורד אדמין עם סטטיסטיקות
- דשבורד דיירים אישי
- גרפים ותרשימים אינטראקטיביים
- דוחות הוצאות וחייבים
- מעקב יתרות בזמן אמת

## טכנולוgiות

### Backend
- **Node.js** + **Express.js** - שרת API
- **MongoDB** + **Mongoose** - מסד נתונים
- **JWT** - אימות ואבטחה
- **WhatsApp Business API** - הודעות אוטומטיות
- **Cloudinary** - אחסון קבצים
- **Cron Jobs** - משימות מתוזמנות

### Frontend
- **React 18** - ממשק משתמש
- **Material-UI** - עיצוב וקומפוננטים
- **React Query** - ניהול מצב ובקשות
- **React Router** - ניווט
- **Recharts** - גרפים וויזואליזציה
- **React Hook Form** - טפסים

## התקנה והפעלה

### דרישות מערכת
- Node.js 16+
- MongoDB 4.4+
- npm או yarn

### התקנה

1. **שכפול הפרויקט**
```bash
git clone <repository-url>
cd building-management-system
```

2. **התקנת תלויות השרת**
```bash
npm run install-server
```

3. **התקנת תלויות הלקוח**
```bash
npm run install-client
```

4. **הגדרת משתני סביבה**
```bash
cp .env.example .env
```
ערוך את הקובץ `.env` והגדר את המשתנים הנדרשים:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/building_management

# JWT
JWT_SECRET=your-super-secret-jwt-key

# WhatsApp API
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### הפעלת המערכת

**בפיתוח:**
```bash
# הפעלת השרת (טרמינל 1)
npm run server

# הפעלת הלקוח (טרמינל 2)
npm run client
```

**בייצור:**
```bash
# בניית הלקוח
npm run build

# הפעלת השרת
npm start
```

## שימוש במערכת

### משתמש אדמין ראשון
```bash
# התחברות למסד הנתונים ויצירת אדמין
node scripts/create-admin.js
```

### API Endpoints

#### אימות
- `POST /api/auth/login` - התחברות
- `POST /api/auth/register` - הרשמה (אדמין בלבד)
- `GET /api/auth/me` - פרטי משתמש נוכחי

#### תשלומים
- `GET /api/payments` - רשימת תשלומים
- `POST /api/payments` - יצירת תשלום
- `PUT /api/payments/:id` - עדכון תשלום
- `POST /api/payments/bulk/create` - יצירת תשלומים בכמויות

#### תחזוקה
- `GET /api/maintenance` - רשימת בקשות תחזוקה
- `POST /api/maintenance` - יצירת בקשת תחזוקה
- `PUT /api/maintenance/:id` - עדכון בקשה

#### ספקים
- `GET /api/suppliers` - רשימת ספקים
- `POST /api/suppliers` - הוספת ספק
- `GET /api/suppliers/:id/payments` - תשלומים לספק

## אינטגרציות

### WhatsApp Business API
1. רישום ב-Meta Business
2. קבלת Access Token
3. הגדרת Webhook
4. הגדרת Phone Number ID

### מערכות תשלום
- **Bit API** - תשלומים מיידיים
- **PayBox API** - עיבוד תשלומים
- **בנקים** - אינטגרציה עם API בנקאי

### Cloudinary
- העלאת תמונות ומסמכים
- אופטימיזציה אוטומטית
- CDN מהיר

## פיתוח

### מבנה הפרויקט
```
building-management-system/
├── server/                 # Backend
│   ├── models/            # מודלי MongoDB
│   ├── routes/            # API routes
│   ├── middleware/        # Middleware
│   ├── services/          # שירותים
│   └── config/            # הגדרות
├── client/                # Frontend
│   ├── src/
│   │   ├── components/    # קומפוננטים
│   │   ├── pages/         # דפים
│   │   ├── contexts/      # React Contexts
│   │   └── utils/         # כלי עזר
│   └── public/
└── docs/                  # תיעוד
```

### הוספת תכונות חדשות
1. יצירת מודל במסד הנתונים
2. הוספת API routes
3. יצירת קומפוננטים ב-React
4. עדכון ניווט ותפריטים

### בדיקות
```bash
# בדיקות שרת
npm run test:server

# בדיקות לקוח
npm run test:client
```

## פריסה (Deployment)

### Docker
```bash
# בניית images
docker-compose build

# הפעלה
docker-compose up -d
```

### שרתים מסחריים
- **Backend**: Heroku, DigitalOcean, AWS
- **Database**: MongoDB Atlas
- **Frontend**: Netlify, Vercel
- **Files**: Cloudinary, AWS S3

## תמיכה ותחזוקה

### ניטור
- לוגים מפורטים
- מעקב ביצועים
- התראות שגיאות

### גיבויים
- גיבוי יומי של מסד הנתונים
- אחסון קבצים בענן
- תיק מבנה דיגיטלי

### עדכונים
- עדכוני אבטחה שוטפים
- תכונות חדשות לפי דרישה
- תמיכה טכנית

## רישיון
MIT License

## יוצר
מערכת ניהול מבנים - פותחה עבור ניהול מקצועי של מבנים ודיירים

---

לשאלות ותמיכה: support@building-management.co.il