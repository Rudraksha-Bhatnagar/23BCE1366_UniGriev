const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Department = require('./models/Department');
const Category = require('./models/Category');
const User = require('./models/User');

dotenv.config();

const DEPARTMENTS = [
    { name: 'Academic Affairs', contactEmail: 'academics@institution.edu' },
    { name: 'Administration', contactEmail: 'admin@institution.edu' },
    { name: 'Finance & Accounts', contactEmail: 'finance@institution.edu' },
    { name: 'Hostel & Accommodation', contactEmail: 'hostel@institution.edu' },
    { name: 'IT & Infrastructure', contactEmail: 'it@institution.edu' },
];

const CATEGORIES = [
    { name: 'Exam & Results', dept: 'Academic Affairs', slaDays: 5, description: 'Issues related to examinations, results, and grading' },
    { name: 'Faculty Complaint', dept: 'Academic Affairs', slaDays: 7, description: 'Complaints regarding faculty conduct or teaching quality' },
    { name: 'Curriculum Issues', dept: 'Academic Affairs', slaDays: 10, description: 'Concerns about syllabus, course structure, or scheduling' },
    { name: 'ID Card & Documents', dept: 'Administration', slaDays: 3, description: 'Requests for ID cards, certificates, and official documents' },
    { name: 'Admission Issues', dept: 'Administration', slaDays: 5, description: 'Problems related to admission process or enrollment' },
    { name: 'General Administration', dept: 'Administration', slaDays: 7, description: 'General administrative requests and complaints' },
    { name: 'Fee Payment Issues', dept: 'Finance & Accounts', slaDays: 3, description: 'Issues with fee payment, refunds, or billing' },
    { name: 'Scholarship & Aid', dept: 'Finance & Accounts', slaDays: 7, description: 'Scholarship applications, financial aid, and stipend issues' },
    { name: 'Room Allocation', dept: 'Hostel & Accommodation', slaDays: 5, description: 'Room allocation, change, or availability issues' },
    { name: 'Hostel Maintenance', dept: 'Hostel & Accommodation', slaDays: 3, description: 'Maintenance requests for hostel facilities' },
    { name: 'Mess & Food', dept: 'Hostel & Accommodation', slaDays: 2, description: 'Complaints about mess food quality or hygiene' },
    { name: 'Network & Wi-Fi', dept: 'IT & Infrastructure', slaDays: 2, description: 'Internet connectivity, Wi-Fi access, and network issues' },
    { name: 'Lab & Equipment', dept: 'IT & Infrastructure', slaDays: 5, description: 'Lab equipment, computer issues, and software access' },
    { name: 'ERP & Portal Issues', dept: 'IT & Infrastructure', slaDays: 3, description: 'Issues with student portal, ERP, or online systems' },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await Department.deleteMany({});
        await Category.deleteMany({});
        await User.deleteMany({});
        console.log('Cleared existing departments, categories, and users');

        const deptDocs = await Department.insertMany(DEPARTMENTS);
        console.log(`Created ${deptDocs.length} departments`);

        const deptMap = {};
        deptDocs.forEach((d) => {
            deptMap[d.name] = d._id;
        });

        const categoryDocs = CATEGORIES.map((c) => ({
            name: c.name,
            departmentId: deptMap[c.dept],
            slaDays: c.slaDays,
            description: c.description,
        }));

        const created = await Category.insertMany(categoryDocs);
        console.log(`Created ${created.length} categories`);

        // Create test users — use User.create() so the pre-save bcrypt hook runs
        const PLAIN_PASSWORD = 'admin123';
        const hash = await bcrypt.hash(PLAIN_PASSWORD, 10);
        const TEST_USERS = [
            { name: 'System Admin', email: 'sysadmin@univ.edu', passwordHash: hash, mobileNo: '9000000001', role: 'sysAdmin', departmentId: null },
            { name: 'Academic Dept Admin', email: 'deptadmin@univ.edu', passwordHash: hash, mobileNo: '9000000002', role: 'deptAdmin', departmentId: deptMap['Academic Affairs'] },
            { name: 'Academic Officer', email: 'officer@univ.edu', passwordHash: hash, mobileNo: '9000000003', role: 'officer', departmentId: deptMap['Academic Affairs'] },
            { name: 'Test Student', email: 'student@univ.edu', passwordHash: hash, mobileNo: '9000000004', role: 'citizen', departmentId: null },
        ];

        // Use insertMany with the already-hashed password.
        // The pre-save hook only re-hashes if isModified('passwordHash'), but
        // insertMany docs are treated as new, so we bypass hashing here by using
        // collection.insertMany directly via the model's collection to skip hooks.
        await User.collection.insertMany(TEST_USERS.map((u) => ({
            ...u,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })));
        const userDocs = await User.find({ email: { $in: TEST_USERS.map((u) => u.email) } }).lean();
        console.log(`Created ${userDocs.length} test users`);

        console.log('\n Seed complete!\n');
        console.log('Departments:');
        deptDocs.forEach((d) => console.log(`  • ${d.name} (${d._id})`));
        console.log('\nCategories:');
        created.forEach((c) => console.log(`  • ${c.name} → SLA ${c.slaDays} days`));
        console.log('\nTest Users (password: admin123):');
        userDocs.forEach((u) => console.log(`  • ${u.email} — ${u.role}`));

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
