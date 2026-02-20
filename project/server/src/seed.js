/**
 * Seed script — populates departments and categories in MongoDB.
 * Run: node src/seed.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Department = require('./models/Department');
const Category = require('./models/Category');

dotenv.config();

const DEPARTMENTS = [
    { name: 'Academic Affairs', contactEmail: 'academics@institution.edu' },
    { name: 'Administration', contactEmail: 'admin@institution.edu' },
    { name: 'Finance & Accounts', contactEmail: 'finance@institution.edu' },
    { name: 'Hostel & Accommodation', contactEmail: 'hostel@institution.edu' },
    { name: 'IT & Infrastructure', contactEmail: 'it@institution.edu' },
];

// Categories mapped to department names
const CATEGORIES = [
    // Academic Affairs
    { name: 'Exam & Results', dept: 'Academic Affairs', slaDays: 5, description: 'Issues related to examinations, results, and grading' },
    { name: 'Faculty Complaint', dept: 'Academic Affairs', slaDays: 7, description: 'Complaints regarding faculty conduct or teaching quality' },
    { name: 'Curriculum Issues', dept: 'Academic Affairs', slaDays: 10, description: 'Concerns about syllabus, course structure, or scheduling' },
    // Administration
    { name: 'ID Card & Documents', dept: 'Administration', slaDays: 3, description: 'Requests for ID cards, certificates, and official documents' },
    { name: 'Admission Issues', dept: 'Administration', slaDays: 5, description: 'Problems related to admission process or enrollment' },
    { name: 'General Administration', dept: 'Administration', slaDays: 7, description: 'General administrative requests and complaints' },
    // Finance
    { name: 'Fee Payment Issues', dept: 'Finance & Accounts', slaDays: 3, description: 'Issues with fee payment, refunds, or billing' },
    { name: 'Scholarship & Aid', dept: 'Finance & Accounts', slaDays: 7, description: 'Scholarship applications, financial aid, and stipend issues' },
    // Hostel
    { name: 'Room Allocation', dept: 'Hostel & Accommodation', slaDays: 5, description: 'Room allocation, change, or availability issues' },
    { name: 'Hostel Maintenance', dept: 'Hostel & Accommodation', slaDays: 3, description: 'Maintenance requests for hostel facilities' },
    { name: 'Mess & Food', dept: 'Hostel & Accommodation', slaDays: 2, description: 'Complaints about mess food quality or hygiene' },
    // IT
    { name: 'Network & Wi-Fi', dept: 'IT & Infrastructure', slaDays: 2, description: 'Internet connectivity, Wi-Fi access, and network issues' },
    { name: 'Lab & Equipment', dept: 'IT & Infrastructure', slaDays: 5, description: 'Lab equipment, computer issues, and software access' },
    { name: 'ERP & Portal Issues', dept: 'IT & Infrastructure', slaDays: 3, description: 'Issues with student portal, ERP, or online systems' },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing
        await Department.deleteMany({});
        await Category.deleteMany({});
        console.log('Cleared existing departments and categories');

        // Create departments
        const deptDocs = await Department.insertMany(DEPARTMENTS);
        console.log(`Created ${deptDocs.length} departments`);

        // Map department name → _id
        const deptMap = {};
        deptDocs.forEach((d) => {
            deptMap[d.name] = d._id;
        });

        // Create categories with department references
        const categoryDocs = CATEGORIES.map((c) => ({
            name: c.name,
            departmentId: deptMap[c.dept],
            slaDays: c.slaDays,
            description: c.description,
        }));

        const created = await Category.insertMany(categoryDocs);
        console.log(`Created ${created.length} categories`);

        console.log('\n✅ Seed complete!\n');
        console.log('Departments:');
        deptDocs.forEach((d) => console.log(`  • ${d.name} (${d._id})`));
        console.log('\nCategories:');
        created.forEach((c) => console.log(`  • ${c.name} → SLA ${c.slaDays} days`));

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
