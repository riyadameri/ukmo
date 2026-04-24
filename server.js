const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/st_2em_v2026', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ========== نماذج قاعدة البيانات ==========

// نموذج الطالب (معدل مع إضافة editHistory)
const studentSchema = new mongoose.Schema({
    firstNameAr: { type: String, required: true },
    lastNameAr: { type: String, required: true },
    firstNameLat: { type: String, required: true },
    lastNameLat: { type: String, required: true },
    birthDate: { type: Date, required: true },
    birthPlace: { type: String, required: true },
    registrationNumber: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    group: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    firstYearAverage: { type: Number, default: 0 },
    
    // 🔑 كود الخصوصية - الرقم السري للطالب
    privateCode: { type: String, required: true, unique: true },
    
    preferences: [{
        specialtyCode: { type: String },
        specialtyName: { type: String },
        branch: { type: String },
        type: { type: String, default: 'internal' },
        university: { type: String, default: null },
        priority: { type: Number }
    }],
    
    assignedSpecialty: {
        code: { type: String, default: '' },
        name: { type: String, default: '' },
        branch: { type: String, default: '' }
    },
    
    status: { type: String, default: 'pending', enum: ['pending', 'assigned', 'waiting'] },
    applicationDate: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    
    // سجل التعديلات
    editHistory: [{
        oldPreferences: Array,
        newPreferences: Array,
        modifiedAt: Date,
        reason: String,
        ipAddress: String
    }]
});

const Student = mongoose.model('Student', studentSchema);

// نموذج التخصصات الداخلية
const specialtySchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    nameAr: { type: String, required: true },
    nameFr: { type: String, required: true },
    branch: { type: String, required: true, enum: ['A', 'B', 'C'] },
    availableSeats: { type: Number, default: 30 },
    description: { type: String },
    careerOpportunities: { type: String }
});

const Specialty = mongoose.model('Specialty', specialtySchema);

// نموذج التخصصات الخارجية
const externalSpecialtySchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    nameAr: { type: String, required: true },
    nameFr: { type: String, required: true },
    university: { type: String, required: true },
    location: { type: String },
    availableSeats: { type: Number, default: 10 },
    description: { type: String },
    careerOpportunities: { type: String }
});

const ExternalSpecialty = mongoose.model('ExternalSpecialty', externalSpecialtySchema);

// نموذج الإعدادات
const settingsSchema = new mongoose.Schema({
    academicYear: { type: String, default: '2025/2026' },
    applicationPeriod: {
        isOpen: { type: Boolean, default: true },
        startDate: { type: Date, default: new Date('2026-04-01') },
        endDate: { type: Date, default: new Date('2026-05-15') }
    },
    resultsPublished: { type: Boolean, default: false },
    maxPreferences: { type: Number, default: 11 },
    departmentPassword: { type: String, default: 'stdpfdi9552026MuiRRrdx' },
    allowEdits: { type: Boolean, default: true }  // ميزة التعديل
});

const Settings = mongoose.model('Settings', settingsSchema);

// ========== البيانات الأولية ==========

const defaultInternalSpecialties = [
    { code: 'A01', nameAr: 'آلية (أوتوماتيك)', nameFr: 'Automatique', branch: 'A', availableSeats: 35, description: 'التحكم في أنظمة المصانع', careerOpportunities: 'المصانع، سونطراك' },
    { code: 'A02', nameAr: 'إلكترونيك', nameFr: 'Électronique', branch: 'A', availableSeats: 35, description: 'تصميم الأجهزة الإلكترونية', careerOpportunities: 'شركات الاتصال' },
    { code: 'A03', nameAr: 'اتصالات', nameFr: 'Télécommunications', branch: 'A', availableSeats: 35, description: 'شبكات لاسلكية', careerOpportunities: 'اتصالات الجزائر، جيزي' },
    { code: 'A04', nameAr: 'كهروتقني', nameFr: 'Électrotechnique', branch: 'A', availableSeats: 35, description: 'توليد الكهرباء', careerOpportunities: 'سونلغاز' },
    { code: 'B01', nameAr: 'كهروميكانيك', nameFr: 'Électromécanique', branch: 'B', availableSeats: 30, description: 'هندسة كهربائية وميكانيكية', careerOpportunities: 'الشركات البترولية' },
    { code: 'B02', nameAr: 'هندسة مدنية', nameFr: 'Génie Civil', branch: 'B', availableSeats: 30, description: 'البناء والجسور', careerOpportunities: 'مكاتب الدراسات' },
    { code: 'B03', nameAr: 'هندسة ميكانيكية', nameFr: 'Génie Mécanique', branch: 'B', availableSeats: 30, description: 'تصنيع الآلات', careerOpportunities: 'مصنع كوندور' },
    { code: 'B04', nameAr: 'أشغال عمومية', nameFr: 'Travaux Publics', branch: 'B', availableSeats: 30, description: 'الطرق والجسور', careerOpportunities: 'وزارة الأشغال العمومية' },
    { code: 'B05', nameAr: 'ري', nameFr: 'Hydraulique', branch: 'B', availableSeats: 30, description: 'المياه والسدود', careerOpportunities: 'الجزائرية للمياه' },
    { code: 'C01', nameAr: 'هندسة الطرائق', nameFr: 'Génie des Procédés', branch: 'C', availableSeats: 30, description: 'العمل في المخابر', careerOpportunities: 'صومام' },
    { code: 'C02', nameAr: 'صناعة بتروكيميائية', nameFr: 'Raffinage', branch: 'C', availableSeats: 25, description: 'تكرير النفط', careerOpportunities: 'سونطراك' }
];

const defaultExternalSpecialties = [
    { code: 'H01', nameAr: 'هندسة طبية', nameFr: 'Génie Biomédical', university: 'جامعة قسنطينة', location: 'قسنطينة', availableSeats: 8, description: 'تصميم وصيانة الأجهزة الطبية', careerOpportunities: 'المستشفيات، شركات الأجهزة الطبية' },
    { code: 'H02', nameAr: 'علم المواد', nameFr: 'Science des Matériaux', university: 'جامعة سطيف', location: 'سطيف', availableSeats: 10, description: 'دراسة خواص المواد', careerOpportunities: 'صناعة الطيران، مراكز البحث' },
    { code: 'H03', nameAr: 'هندسة بيئية', nameFr: 'Génie de l\'Environnement', university: 'جامعة عنابة', location: 'عنابة', availableSeats: 8, description: 'معالجة المياه والنفايات', careerOpportunities: 'وزارة البيئة' },
    { code: 'H04', nameAr: 'هندسة نووية', nameFr: 'Génie Nucléaire', university: 'جامعة العلوم والتكنولوجيا هواري بومدين', location: 'الجزائر العاصمة', availableSeats: 5, description: 'الطاقة النووية', careerOpportunities: 'مركز البحث النووي' },
    { code: 'H05', nameAr: 'هندسة طيران', nameFr: 'Génie Aérospatial', university: 'جامعة باب الزوار', location: 'الجزائر العاصمة', availableSeats: 5, description: 'تصميم الطائرات', careerOpportunities: 'صناعة الطيران' }
];

async function initializeDatabase() {
    const internalCount = await Specialty.countDocuments();
    if (internalCount === 0) {
        for (const spec of defaultInternalSpecialties) {
            await Specialty.create(spec);
        }
        console.log('✅ Internal specialties initialized');
    }
    
    const externalCount = await ExternalSpecialty.countDocuments();
    if (externalCount === 0) {
        for (const spec of defaultExternalSpecialties) {
            await ExternalSpecialty.create(spec);
        }
        console.log('✅ External specialties initialized');
    }
    
    const settings = await Settings.findOne();
    if (!settings) {
        await Settings.create({});
        console.log('✅ Settings initialized');
    }
}

// ========== API Routes ==========

// 1. الحصول على جميع التخصصات
app.get('/api/specialties', async (req, res) => {
    try {
        const internalSpecialties = await Specialty.find().sort({ branch: 1, code: 1 });
        const externalSpecialties = await ExternalSpecialty.find().sort({ code: 1 });
        
        res.json({ 
            success: true, 
            internalSpecialties,
            externalSpecialties
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 2. التحقق من فترة التقديم
app.get('/api/application-period', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const now = new Date();
        const isOpen = settings?.applicationPeriod?.isOpen !== false &&
                      now >= new Date('2026-04-01') && now <= new Date('2026-05-15');
        
        res.json({
            success: true,
            isOpen,
            startDate: '2026-04-01',
            endDate: '2026-05-15',
            resultsPublished: settings?.resultsPublished || false,
            allowEdits: settings?.allowEdits || true
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 3. تقديم طلب جديد (معدل)
app.post('/api/students/apply', async (req, res) => {
    try {
        const { 
            firstNameAr, lastNameAr, firstNameLat, lastNameLat,
            birthDate, birthPlace, registrationNumber, phone, 
            group, email, preferences
        } = req.body;
        
        if (!preferences || preferences.length < 11) {
            return res.status(400).json({ success: false, message: 'يجب إدخال 11 رغبة على الأقل' });
        }
        
        const existingStudent = await Student.findOne({ registrationNumber });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: 'رقم التسجيل مسجل مسبقاً' });
        }
        
        const existingEmail = await Student.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
        }
        
        // إنشاء كود خصوصية فريد
        let privateCode = '';
        let isUnique = false;
        while (!isUnique) {
            privateCode = Math.floor(100000 + Math.random() * 900000).toString();
            const existing = await Student.findOne({ privateCode });
            if (!existing) isUnique = true;
        }
        
        const newStudent = new Student({
            firstNameAr, lastNameAr, firstNameLat, lastNameLat,
            birthDate: new Date(birthDate), birthPlace,
            registrationNumber, phone, group, email,
            privateCode: privateCode,
            preferences: preferences.map((p, idx) => ({ 
                specialtyCode: p.code, 
                specialtyName: p.specialtyName || p.name,
                branch: p.branch,
                type: p.type || 'internal',
                university: p.university || null,
                priority: idx + 1 
            })),
            status: 'pending',
            editHistory: []
        });
        
        await newStudent.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'تم تقديم الطلب بنجاح',
            privateCode: privateCode,
            student: {
                firstNameAr, lastNameAr,
                registrationNumber,
                preferences: newStudent.preferences
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم: ' + error.message });
    }
});

// 4. الوصول الآمن للطالب (معدل)
app.post('/api/students/secure-access', async (req, res) => {
    try {
        const { registrationNumber, privateCode } = req.body;
        
        const student = await Student.findOne({ 
            registrationNumber: registrationNumber, 
            privateCode: privateCode 
        });
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
        }
        
        const safeStudent = student.toObject();
        delete safeStudent.privateCode;
        
        res.json({ success: true, student: safeStudent });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 5. تحديث الرغبات (معدل مع تسجيل التعديلات)
app.put('/api/students/update-preferences', async (req, res) => {
    try {
        const { registrationNumber, privateCode, preferences, reason } = req.body;
        
        const student = await Student.findOne({ 
            registrationNumber: registrationNumber, 
            privateCode: privateCode 
        });
        
        if (!student) {
            return res.status(403).json({ success: false, message: 'غير مصرح - كود الخصوصية غير صحيح' });
        }
        
        // التحقق من السماح بالتعديل
        const settings = await Settings.findOne();
        if (settings && !settings.allowEdits) {
            return res.status(403).json({ success: false, message: 'فترة التعديل مغلقة حالياً' });
        }
        
        // حفظ النسخة القديمة للتعديل
        const oldPreferences = JSON.parse(JSON.stringify(student.preferences));
        
        // تحديث الرغبات
        student.preferences = preferences.map((p, idx) => ({
            specialtyCode: p.code,
            specialtyName: p.name,
            branch: p.branch,
            type: p.type,
            university: p.university || null,
            priority: idx + 1
        }));
        student.lastModified = new Date();
        
        // إضافة سجل التعديل
        student.editHistory.push({
            oldPreferences: oldPreferences,
            newPreferences: student.preferences,
            modifiedAt: new Date(),
            reason: reason || 'تعديل من قبل الطالب',
            ipAddress: req.ip || req.connection.remoteAddress
        });
        
        await student.save();
        
        res.json({ 
            success: true, 
            message: 'تم تحديث الرغبات بنجاح',
            editCount: student.editHistory.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// 6. الحصول على النتائج
app.post('/api/students/results', async (req, res) => {
    try {
        const { registrationNumber, privateCode } = req.body;
        
        const student = await Student.findOne({ 
            registrationNumber: registrationNumber, 
            privateCode: privateCode 
        });
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'بيانات غير صحيحة' });
        }
        
        const settings = await Settings.findOne();
        
        res.json({
            success: true,
            resultsPublished: settings?.resultsPublished || false,
            assignedSpecialty: student.assignedSpecialty,
            status: student.status,
            firstYearAverage: student.firstYearAverage
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 7. تسجيل دخول رئيس القسم
app.post('/api/department/login', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const password = settings?.departmentPassword || 'stdpfdi9552026MuiRRrdx';
        
        if (req.body.password === password) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 8. جلب جميع الطلاب لرئيس القسم
app.get('/api/department/students', async (req, res) => {
    try {
        const students = await Student.find().select('-privateCode');
        res.json({ success: true, students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 9. تحديث معدل الطالب
app.put('/api/department/students/:id/average', async (req, res) => {
    try {
        const { average } = req.body;
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { firstYearAverage: parseFloat(average) },
            { new: true }
        );
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 10. نشر النتائج
app.post('/api/department/publish-results', async (req, res) => {
    try {
        const students = await Student.find().sort({ firstYearAverage: -1 });
        const internalSpecialties = await Specialty.find();
        const externalSpecialties = await ExternalSpecialty.find();
        
        let availableSeats = {};
        internalSpecialties.forEach(spec => { availableSeats[spec.code] = spec.availableSeats; });
        externalSpecialties.forEach(spec => { availableSeats[spec.code] = spec.availableSeats; });
        
        for (const student of students) {
            let assigned = false;
            
            for (const pref of student.preferences) {
                if (availableSeats[pref.specialtyCode] > 0) {
                    student.assignedSpecialty = {
                        code: pref.specialtyCode,
                        name: pref.specialtyName,
                        branch: pref.branch
                    };
                    student.status = 'assigned';
                    availableSeats[pref.specialtyCode]--;
                    assigned = true;
                    break;
                }
            }
            
            if (!assigned) {
                student.status = 'waiting';
            }
            
            await student.save();
        }
        
        await Settings.findOneAndUpdate({}, { resultsPublished: true });
        
        res.json({ success: true, message: 'تم نشر النتائج بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 11. تحديث المقاعد المتاحة
app.put('/api/department/specialties/:code/seats', async (req, res) => {
    try {
        const { code } = req.params;
        const { availableSeats } = req.body;
        
        const specialty = await Specialty.findOneAndUpdate(
            { code: code },
            { availableSeats: parseInt(availableSeats) },
            { new: true }
        );
        
        if (!specialty) {
            return res.status(404).json({ success: false, message: 'التخصص غير موجود' });
        }
        
        res.json({ success: true, specialty });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 12. تعيين تخصص للطالب يدوياً
app.put('/api/department/students/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { specialtyCode, specialtyName, branch } = req.body;
        
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
        }
        
        student.assignedSpecialty = {
            code: specialtyCode,
            name: specialtyName,
            branch: branch || ''
        };
        student.status = 'assigned';
        await student.save();
        
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 13. استيراد المعدلات من CSV
app.post('/api/department/import-grades', async (req, res) => {
    try {
        const { grades } = req.body;
        
        if (!grades || !Array.isArray(grades)) {
            return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
        }
        
        let updated = 0;
        let notFound = 0;
        
        for (const item of grades) {
            const student = await Student.findOne({ registrationNumber: item.registrationNumber });
            if (student) {
                student.firstYearAverage = parseFloat(item.average);
                await student.save();
                updated++;
            } else {
                notFound++;
            }
        }
        
        res.json({ 
            success: true, 
            message: `تم تحديث ${updated} طالب${notFound > 0 ? `، ${notFound} طالب غير موجود` : ''}`,
            updated,
            notFound
        });
    } catch (error) {
        console.error('Error importing grades:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم: ' + error.message });
    }
});

// 14. الحصول على سجل تعديلات الطالب (API جديد)
app.get('/api/students/:id/edit-history', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select('editHistory firstNameAr lastNameAr registrationNumber');
        if (!student) {
            return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
        }
        
        res.json({ 
            success: true, 
            student: {
                name: `${student.firstNameAr} ${student.lastNameAr}`,
                registrationNumber: student.registrationNumber,
                editHistory: student.editHistory
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// 15. تفعيل/تعطيل ميزة التعديل (API جديد)
app.put('/api/department/toggle-edits', async (req, res) => {
    try {
        const { allowEdits } = req.body;
        await Settings.findOneAndUpdate({}, { allowEdits: allowEdits });
        res.json({ success: true, message: `تم ${allowEdits ? 'تفعيل' : 'تعطيل'} التعديلات` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});


// ========== API Routes جديدة ==========

// 16. إعادة تعيين التوجيه بالكامل
app.post('/api/department/reset-assignments', async (req, res) => {
    try {
        await Student.updateMany({}, {
            assignedSpecialty: { code: '', name: '', branch: '' },
            status: 'pending'
        });
        
        await Settings.findOneAndUpdate({}, { resultsPublished: false });
        
        res.json({ success: true, message: 'تم إعادة تعيين جميع التوجيهات بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// 17. حذف طالب
app.delete('/api/department/students/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
        }
        res.json({ success: true, message: 'تم حذف الطالب بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// 18. حذف تخصص (داخلي أو خارجي)
app.delete('/api/department/specialty/:type/:code', async (req, res) => {
    try {
        const { type, code } = req.params;
        let deleted = false;
        
        if (type === 'internal') {
            const result = await Specialty.findOneAndDelete({ code: code });
            deleted = !!result;
        } else if (type === 'external') {
            const result = await ExternalSpecialty.findOneAndDelete({ code: code });
            deleted = !!result;
        }
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'التخصص غير موجود' });
        }
        
        res.json({ success: true, message: 'تم حذف التخصص بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// 19. إضافة تخصص جديد
app.post('/api/department/specialty', async (req, res) => {
    try {
        const { type, code, nameAr, nameFr, branch, university, availableSeats, description } = req.body;
        
        if (type === 'internal') {
            const existing = await Specialty.findOne({ code });
            if (existing) {
                return res.status(400).json({ success: false, message: 'الكود موجود مسبقاً' });
            }
            
            const newSpecialty = new Specialty({
                code, nameAr, nameFr, branch, availableSeats: availableSeats || 30, description
            });
            await newSpecialty.save();
        } else if (type === 'external') {
            const existing = await ExternalSpecialty.findOne({ code });
            if (existing) {
                return res.status(400).json({ success: false, message: 'الكود موجود مسبقاً' });
            }
            
            const newSpecialty = new ExternalSpecialty({
                code, nameAr, nameFr, university, availableSeats: availableSeats || 10, description
            });
            await newSpecialty.save();
        }
        
        res.json({ success: true, message: 'تم إضافة التخصص بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// 20. توجيه طالب يدوياً من قائمة التخصصات
app.put('/api/department/students/:id/manual-assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { specialtyCode } = req.body;
        
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
        }
        
        // البحث عن التخصص (داخلي أو خارجي)
        let specialty = await Specialty.findOne({ code: specialtyCode });
        let specialtyType = 'internal';
        
        if (!specialty) {
            specialty = await ExternalSpecialty.findOne({ code: specialtyCode });
            specialtyType = 'external';
        }
        
        if (!specialty) {
            return res.status(404).json({ success: false, message: 'التخصص غير موجود' });
        }
        
        student.assignedSpecialty = {
            code: specialty.code,
            name: specialty.nameAr,
            branch: specialty.branch || '',
            type: specialtyType
        };
        student.status = 'assigned';
        await student.save();
        
        res.json({ 
            success: true, 
            message: `تم توجيه الطالب إلى تخصص ${specialty.nameAr}`,
            student 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// 21. الحصول على قائمة التخصصات للتوجيه اليدوي
app.get('/api/department/all-specialties', async (req, res) => {
    try {
        const internalSpecialties = await Specialty.find().sort({ branch: 1, code: 1 });
        const externalSpecialties = await ExternalSpecialty.find().sort({ code: 1 });
        
        const allSpecialties = [
            ...internalSpecialties.map(s => ({ ...s.toObject(), type: 'internal' })),
            ...externalSpecialties.map(s => ({ ...s.toObject(), type: 'external' }))
        ];
        
        res.json({ success: true, specialties: allSpecialties });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ: ' + error.message });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initializeDatabase();
    console.log('📚 System ready');
});