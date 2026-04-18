const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// تهيئة تطبيق Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة بيانات MongoDB
mongoose.connect('mongodb://localhost:27017/student_orientation', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// نماذج قاعدة البيانات

// نموذج الطالب
const studentSchema = new mongoose.Schema({
    registrationNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    birthDate: { type: Date, required: true },
    bacYear: { type: Number, required: true },
    specialtyChoice: { type: String, required: true, enum: ['automation', 'petroleum'] },
    average: { type: Number, default: 0 },
    assignedSpecialty: { type: String, default: '', enum: ['', 'automation', 'petroleum'] },
    applicationDate: { type: Date, default: Date.now },
    status: { type: String, default: 'pending', enum: ['pending', 'assigned'] }
});

const Student = mongoose.model('Student', studentSchema);

// نموذج الإعدادات
const settingsSchema = new mongoose.Schema({
    automationSeats: { type: Number, default: 25 },
    petroleumSeats: { type: Number, default: 25 },
    departmentPassword: { type: String, default: 'achbi260178983ffA*' },
    resultsCalculated: { type: Boolean, default: false }
});

const Settings = mongoose.model('Settings', settingsSchema);

// تهيئة الإعدادات إذا لم تكن موجودة
async function initializeSettings() {
    const settings = await Settings.findOne();
    if (!settings) {
        await Settings.create({});
        console.log('Initialized default settings');
    }
}

// API Routes

// 1. تقديم طلب جديد للطالب
app.post('/api/students/apply', async (req, res) => {
    try {
        const { registrationNumber, email, phone, birthDate, bacYear, specialtyChoice } = req.body;
        
        // التحقق من البيانات
        if (!registrationNumber || !email || !phone || !birthDate || !bacYear || !specialtyChoice) {
            return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
        }
        
        // التحقق من عدم تكرار رقم التسجيل
        const existingStudent = await Student.findOne({ registrationNumber });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: 'رقم التسجيل مسجل مسبقاً' });
        }
        
        // إنشاء طالب جديد
        const newStudent = new Student({
            registrationNumber,
            email,
            phone,
            birthDate: new Date(birthDate),
            bacYear,
            specialtyChoice
        });
        
        await newStudent.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'تم تقديم الطلب بنجاح',
            student: newStudent
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 2. الحصول على طلبات الطالب
app.get('/api/students/:registrationNumber', async (req, res) => {
    try {
        const { registrationNumber } = req.params;
        
        const student = await Student.findOne({ registrationNumber });
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الطالب' });
        }
        
        res.json({ success: true, student });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 3. تسجيل دخول رئيس القسم
app.post('/api/department/login', async (req, res) => {
    try {
        const { password } = req.body;
        
        const settings = await Settings.findOne();
        const correctPassword = settings ? settings.departmentPassword : 'achbi260178983ffA*';
        
        if (password === correctPassword) {
            res.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
        } else {
            res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 4. الحصول على جميع الطلبة (لرئيس القسم)
app.get('/api/department/students', async (req, res) => {
    try {
        const students = await Student.find().sort({ average: -1 });
        const settings = await Settings.findOne();
        
        res.json({ 
            success: true, 
            students,
            settings: settings || {
                automationSeats: 25,
                petroleumSeats: 25,
                resultsCalculated: false
            }
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 5. تحديث معدل الطالب
app.put('/api/department/students/:id/average', async (req, res) => {
    try {
        const { id } = req.params;
        const { average } = req.body;
        
        if (!average || average < 0 || average > 20) {
            return res.status(400).json({ success: false, message: 'المعدل يجب أن يكون بين 0 و 20' });
        }
        
        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            { average },
            { new: true }
        );
        
        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الطالب' });
        }
        
        res.json({ success: true, student: updatedStudent });
    } catch (error) {
        console.error('Error updating average:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 6. تحديث عدد المناصب
app.put('/api/department/settings/seats', async (req, res) => {
    try {
        const { automationSeats, petroleumSeats } = req.body;
        
        if (automationSeats === undefined || petroleumSeats === undefined) {
            return res.status(400).json({ success: false, message: 'عدد المناصب مطلوب' });
        }
        
        let settings = await Settings.findOne();
        
        if (!settings) {
            settings = new Settings({ automationSeats, petroleumSeats });
        } else {
            settings.automationSeats = automationSeats;
            settings.petroleumSeats = petroleumSeats;
        }
        
        await settings.save();
        
        res.json({ 
            success: true, 
            message: 'تم تحديث عدد المناصب',
            settings 
        });
    } catch (error) {
        console.error('Error updating seats:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 7. احتساب النتائج وتوزيع الطلبة
app.post('/api/department/calculate-results', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        
        // الحصول على جميع الطلبة مرتبين حسب المعدل تنازلياً
        const students = await Student.find().sort({ average: -1 });
        
        // تهيئة العدادات
        let automationAssigned = 0;
        let petroleumAssigned = 0;
        const automationSeats = settings.automationSeats;
        const petroleumSeats = settings.petroleumSeats;
        
        // توزيع الطلبة حسب المعدل
        for (const student of students) {
            // إذا كان الطالب قد حصل على معدل
            if (student.average > 0) {
                // إذا كان التخصص المطلوب هو الآلية العامة وهناك مقاعد متاحة
                if (student.specialtyChoice === 'automation' && automationAssigned < automationSeats) {
                    student.assignedSpecialty = 'automation';
                    student.status = 'assigned';
                    automationAssigned++;
                }
                // إذا كان التخصص المطلوب هو الآتية البترولية وهناك مقاعد متاحة
                else if (student.specialtyChoice === 'petroleum' && petroleumAssigned < petroleumSeats) {
                    student.assignedSpecialty = 'petroleum';
                    student.status = 'assigned';
                    petroleumAssigned++;
                }
                // إذا لم يكن هناك مقاعد في التخصص المطلوب
                else {
                    // محاولة تعيينه في التخصص الآخر إذا كان هناك مقاعد
                    if (automationAssigned < automationSeats && student.assignedSpecialty !== 'automation') {
                        student.assignedSpecialty = 'automation';
                        student.status = 'assigned';
                        automationAssigned++;
                    } else if (petroleumAssigned < petroleumSeats && student.assignedSpecialty !== 'petroleum') {
                        student.assignedSpecialty = 'petroleum';
                        student.status = 'assigned';
                        petroleumAssigned++;
                    } else {
                        // لا توجد مقاعد متاحة في أي تخصص
                        student.assignedSpecialty = '';
                        student.status = 'pending';
                    }
                }
                
                await student.save();
            }
        }
        
        // تحديث حالة النتائج
        settings.resultsCalculated = true;
        await settings.save();
        
        res.json({ 
            success: true, 
            message: 'تم احتساب النتائج وتوزيع الطلبة بنجاح',
            statistics: {
                totalStudents: students.length,
                automationAssigned,
                petroleumAssigned,
                automationSeats,
                petroleumSeats
            }
        });
    } catch (error) {
        console.error('Error calculating results:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 8. تغيير تخصص طالب يدوياً
app.put('/api/department/students/:id/specialty', async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedSpecialty } = req.body;
        
        if (!assignedSpecialty || !['automation', 'petroleum', ''].includes(assignedSpecialty)) {
            return res.status(400).json({ success: false, message: 'التخصص المحدد غير صحيح' });
        }
        
        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            { 
                assignedSpecialty,
                status: assignedSpecialty ? 'assigned' : 'pending'
            },
            { new: true }
        );
        
        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الطالب' });
        }
        
        res.json({ success: true, student: updatedStudent });
    } catch (error) {
        console.error('Error updating specialty:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 9. الحصول على إحصائيات التطبيق
app.get('/api/statistics', async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const automationStudents = await Student.countDocuments({ specialtyChoice: 'automation' });
        const petroleumStudents = await Student.countDocuments({ specialtyChoice: 'petroleum' });
        const assignedStudents = await Student.countDocuments({ status: 'assigned' });
        const pendingStudents = await Student.countDocuments({ status: 'pending' });
        
        const settings = await Settings.findOne();
        
        res.json({
            success: true,
            statistics: {
                totalStudents,
                automationStudents,
                petroleumStudents,
                assignedStudents,
                pendingStudents,
                automationSeats: settings?.automationSeats || 25,
                petroleumSeats: settings?.petroleumSeats || 25
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 10. حذف طالب
app.delete('/api/department/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedStudent = await Student.findByIdAndDelete(id);
        
        if (!deletedStudent) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الطالب' });
        }
        
        res.json({ success: true, message: 'تم حذف الطالب بنجاح' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});

// 11. إعادة تعيين النتائج
app.post('/api/department/reset-results', async (req, res) => {
    try {
        // إعادة تعيين جميع الطلبة
        await Student.updateMany(
            {},
            { 
                assignedSpecialty: '',
                status: 'pending'
            }
        );
        
        // إعادة تعيين إعدادات النتائج
        const settings = await Settings.findOne();
        if (settings) {
            settings.resultsCalculated = false;
            await settings.save();
        }
        
        res.json({ success: true, message: 'تم إعادة تعيين النتائج بنجاح' });
    } catch (error) {
        console.error('Error resetting results:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
});
app.use(express.static(path.join(__dirname, 'public')));
// في server.js، قبل routes الأخرى، أضف:

// السماح بالوصول المباشر إلى ملفات Let's Encrypt
app.use('/.well-known/acme-challenge', express.static(
    path.join(__dirname, '.well-known/acme-challenge'), 
    { dotfiles: 'allow', fallthrough: false }
));

// Or use specific route handler:
app.get('/.well-known/acme-challenge/:token', (req, res) => {
    const challengePath = path.join(__dirname, '.well-known/acme-challenge', req.params.token);
    
    console.log(`ACME challenge for: ${req.params.token}`);
    
    if (fs.existsSync(challengePath)) {
        res.setHeader('Content-Type', 'text/plain');
        res.sendFile(challengePath);
    } else {
        console.error(`ACME file not found: ${challengePath}`);
        res.status(404).send('Not found');
    }
});


// خدمة الملفات الثابتة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// تشغيل الخادم
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initializeSettings();
    console.log('Server initialized successfully');
});