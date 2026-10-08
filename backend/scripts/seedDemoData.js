const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const db = require('../src/models/db');
const userModel = require('../src/models/userModel');
const woundModel = require('../src/models/woundModel');
const woundEntryModel = require('../src/models/woundEntryModel');
const comparisonService = require('../src/services/comparisonService');

// Minimal valid JPEG binary buffer for sample photo storage
const SAMPLE_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function seedDemoData() {
  console.log('🌱 WoundWise Demo Data Seed Script running...\n');

  // 1. Initialize DB / Local Storage Engine
  await db.initDatabase();

  // 2. Find or ensure demo user exists
  const demoEmail = 'divesh@woundwise.local';
  let user = await userModel.findByEmail(demoEmail);

  if (!user) {
    console.log(`Creating demo user: ${demoEmail}...`);
    user = await userModel.createUser({
      name: 'Divesh Reddy',
      email: demoEmail,
      passwordHash: '$2a$10$Z5gWEs.DhL3QKB.C5vqY8OpGUGo9H0AfTr7mlc.uaBQ4C1TZl.q.i', // "woundwise123"
      role: 'Patient',
      phone: '+1 (555) 382-9012'
    });
  }
  console.log(`✅ Demo User: ${user.name} (${user.email}) | ID: ${user.id}`);

  // 3. Check for existing demo wound to ensure script is IDEMPOTENT
  const demoTitle = 'Demo Surgical Wound Progression';
  const existingWounds = await woundModel.getWoundsByUser(user.id);
  let targetWound = existingWounds.find(w => w.title === demoTitle);

  if (targetWound) {
    const existingEntries = await woundEntryModel.getEntriesByWound(targetWound.id, user.id);
    if (existingEntries.length >= 2) {
      console.log(`\nℹ️ Demo wound case "${demoTitle}" already exists with ${existingEntries.length} entries.`);
      console.log('✅ Seed script completed cleanly (Idempotent run: no duplicate data created).');
      return;
    }
  }

  // Create demo wound case if not present
  if (!targetWound) {
    console.log(`\nCreating demo wound case: "${demoTitle}"...`);
    targetWound = await woundModel.createWound({
      userId: user.id,
      title: demoTitle,
      location: 'Right Lower Leg',
      status: 'Active'
    });
  }
  console.log(`✅ Demo Wound ID: ${targetWound.id}`);

  // 4. Ensure demo photo files exist in uploads/
  const uploadsDir = config.uploads.directory;
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const day1ImgName = 'wound_demo_day1.jpg';
  const day3ImgName = 'wound_demo_day3.jpg';

  const day1ImgPath = path.join(uploadsDir, day1ImgName);
  const day3ImgPath = path.join(uploadsDir, day3ImgName);

  const seedAssetsDir = path.resolve(__dirname, '../src/seed_assets');

  if (!fs.existsSync(day1ImgPath)) {
    const seed1 = path.join(seedAssetsDir, day1ImgName);
    if (fs.existsSync(seed1)) {
      fs.copyFileSync(seed1, day1ImgPath);
    } else {
      fs.writeFileSync(day1ImgPath, Buffer.from(SAMPLE_JPEG_BASE64, 'base64'));
    }
  }
  if (!fs.existsSync(day3ImgPath)) {
    const seed3 = path.join(seedAssetsDir, day3ImgName);
    if (fs.existsSync(seed3)) {
      fs.copyFileSync(seed3, day3ImgPath);
    } else {
      fs.writeFileSync(day3ImgPath, Buffer.from(SAMPLE_JPEG_BASE64, 'base64'));
    }
  }

  // 5. Create Day 1 Baseline Entry using real backend logic
  console.log('\nCreating Day 1 Baseline Entry...');
  const day1Entry = await woundEntryModel.createEntry({
    woundId: targetWound.id,
    userId: user.id,
    imageFilename: day1ImgName,
    originalFilename: 'demo_day1_baseline.jpg',
    mimeType: 'image/jpeg',
    fileSize: 134,
    notes: 'Day 1 Baseline: Post-operative surgical wound on right leg. Moderate periwound swelling and initial pain.',
    isFollowup: false,
    followupDay: 1,
    qualityMetrics: { lit: true, sharp: true, skinPercentage: 18, isSkinLikely: true },
    entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  });

  const day1Meas = {
    coveragePct: 18.5,
    physicalAreaCm2: 6.20,
    woundAreaPx: 22400,
    roi: { x: 40, y: 40, w: 220, h: 220 },
    boundary: [{ x: 50, y: 50 }, { x: 190, y: 50 }, { x: 190, y: 190 }, { x: 50, y: 190 }],
    segConfidence: 'good'
  };

  const day1Sym = {
    painScore: 6,
    swellingLevel: 'Moderate',
    rednessStatus: 'Normal',
    warmthStatus: 'No',
    functionStatus: 'Some difficulty',
    fever: false,
    discharge: false,
    badSmell: false
  };

  await woundEntryModel.updateMeasurements(day1Entry.id, user.id, day1Meas);
  const updatedDay1 = await woundEntryModel.updateSymptoms(day1Entry.id, user.id, day1Sym);

  // Compute baseline comparison & triage via real comparisonService
  const day1Comp = comparisonService.buildWoundComparison(updatedDay1, updatedDay1, [updatedDay1]);
  await woundEntryModel.updateTriageAndComparison(day1Entry.id, user.id, {
    triageLevel: day1Comp.triage.level,
    triageReasons: day1Comp.triage.reasons,
    comparisonData: day1Comp
  });
  console.log(`✅ Day 1 Baseline Entry created (ID: ${day1Entry.id}) | Area: 6.20 cm² | Pain: 6/10`);

  // 6. Create Day 3 Follow-up Entry using real backend logic
  console.log('\nCreating Day 3 Follow-up Entry...');
  const day3Entry = await woundEntryModel.createEntry({
    woundId: targetWound.id,
    userId: user.id,
    imageFilename: day3ImgName,
    originalFilename: 'demo_day3_followup.jpg',
    mimeType: 'image/jpeg',
    fileSize: 134,
    notes: 'Day 3 Follow-up: Periwound swelling reduced to mild. Wound area visibly shrinking, pain improved.',
    isFollowup: true,
    followupDay: 3,
    qualityMetrics: { lit: true, sharp: true, skinPercentage: 16, isSkinLikely: true },
    entryDate: new Date().toISOString()
  });

  const day3Meas = {
    coveragePct: 12.2,
    physicalAreaCm2: 4.10,
    woundAreaPx: 14800,
    roi: { x: 40, y: 40, w: 220, h: 220 },
    boundary: [{ x: 70, y: 70 }, { x: 170, y: 70 }, { x: 170, y: 170 }, { x: 70, y: 170 }],
    segConfidence: 'good'
  };

  const day3Sym = {
    painScore: 3,
    swellingLevel: 'Mild',
    rednessStatus: 'Normal',
    warmthStatus: 'No',
    functionStatus: 'Yes, normal',
    fever: false,
    discharge: false,
    badSmell: false
  };

  await woundEntryModel.updateMeasurements(day3Entry.id, user.id, day3Meas);
  const updatedDay3 = await woundEntryModel.updateSymptoms(day3Entry.id, user.id, day3Sym);

  // Compute Day 3 comparison & triage via real comparisonService against Day 1 baseline
  const day3Comp = comparisonService.buildWoundComparison(updatedDay3, updatedDay1, [updatedDay1, updatedDay3]);
  await woundEntryModel.updateTriageAndComparison(day3Entry.id, user.id, {
    triageLevel: day3Comp.triage.level,
    triageReasons: day3Comp.triage.reasons,
    comparisonData: day3Comp
  });

  console.log(`✅ Day 3 Follow-up Entry created (ID: ${day3Entry.id}) | Area: 4.10 cm² | Pain: 3/10`);
  console.log(`✅ Longitudinal Healing Verdict computed: "${day3Comp.healingProgress}" (${day3Comp.areaDiff.formattedText})`);

  console.log('\n🎉 DEMO DATA SEEDED SUCCESSFULLY!');
}

module.exports = { seedDemoData };

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Error seeding demo data:', err);
      process.exit(1);
    });
}
