# חיבור Supabase — מדריך הקמה

## 1. צור פרויקט
1. היכנס ל-https://supabase.com → **New project**.
2. בחר אזור **EU (Frankfurt)** — הכי קרוב לישראל מבחינת latency ופרטיות.
   ⚠️ הערה מהמועצה: Supabase לא מאחסן בישראל. לפני production מלא — בדיקת תאימות לחוק הגנת הפרטיות.
3. שמור את סיסמת ה-DB.

## 2. הרץ את הסכמה
1. בדאשבורד → **SQL Editor** → **New query**.
2. הדבק את כל התוכן של [`schema.sql`](./schema.sql) → **Run**.
   זה יוצר את כל הטבלאות, ה-RLS, פונקציית המשיכה האטומית `pull_deal()`, ו-audit log.

## 3. חבר את האפליקציה
1. בדאשבורד → **Project Settings → API**.
2. העתק את **Project URL** ואת מפתח **anon / public**.
3. בתיקיית הפרויקט: צור קובץ `.env.local` (העתק מ-`.env.local.example`) ומלא:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. הפעל מחדש את `npm run dev`.

## 4. צור משתמש אדמין ראשון
1. דאשבורד → **Authentication → Users → Add user** (אימייל + סיסמה).
2. SQL Editor — הוסף פרופיל אדמין (החלף את ה-UUID במזהה המשתמש שנוצר):
   ```sql
   insert into profiles (id, full_name, role)
   values ('PASTE-USER-UUID', 'מנהל מערכת', 'admin');
   ```
3. עכשיו האדמין יכול לרשום בנקים, מתווכים ובנקאים.

## 5. בדיקת תקינות
- ה-app כבר מחובר: `src/lib/supabase/client.ts` (דפדפן) ו-`server.ts` (שרת).
- ה-middleware (`src/middleware.ts`) מרענן session ומגן על `/dashboard`, `/admin`, `/banker`, `/nonbank`.
- כל עוד אין `.env.local` — ה-middleware עוקף את ה-auth כדי שההדמיה תמשיך לעבוד.

> כשתסיים — תן לי סימן ואני אחבר את מסך הדשבורד לנתונים אמיתיים ואבנה את טופס כרטיס הלקוח המלא.