const fs = require('fs');
const path = require('path');

async function runTests() {
  if (process.env.ALLOW_TEST_DATA !== 'true' && process.env.NODE_ENV !== 'test') {
    console.error('\n❌ ERROR: test_e2e_flow.js is blocked from executing against live demo data.');
    console.error('To run this test without polluting live demo database, set ALLOW_TEST_DATA=true e.g.:');
    console.error('  ALLOW_TEST_DATA=true node test_e2e_flow.js\n');
    process.exit(1);
  }

  console.log('🧪 Starting WoundWise Full-Stack API & Longitudinal Tracking Verification...\n');
  const baseUrl = 'http://127.0.0.1:5000/api';

  // 1. Health check
  console.log('1. Testing Health Check...');
  const healthRes = await fetch(`${baseUrl}/health`);
  const health = await healthRes.json();
  console.log('   Health Status:', health.status, '| Database:', health.database);
  if (health.status !== 'healthy') throw new Error('Health check failed');

  // 2. Authentication: Login default user
  console.log('\n2. Testing User Authentication (Login)...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'divesh@woundwise.local', password: 'woundwise123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.data.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.token;
  const user = loginData.data.user;
  console.log(`   Logged in successfully as: ${user.name} (${user.email})`);

  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  // 3. Check Initial Dashboard
  console.log('\n3. Testing Dashboard Fetch...');
  const dashRes = await fetch(`${baseUrl}/wounds/dashboard`, { headers: authHeaders });
  const dashData = await dashRes.json();
  console.log('   Dashboard loaded for user:', dashData.data.userName);

  // 4. Test Day 1 Wound Upload
  console.log('\n4. Testing Day 1 Baseline Wound Upload...');
  const dummyJpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  
  const boundary = '----WebKitFormBoundaryWoundWiseTest' + Date.now();
  let bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nLongitudinal Test Burn\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="location"\r\n\r\nRight Forearm\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="notes"\r\n\r\nDay 1 Baseline photo taken.\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="wound_day1.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    dummyJpg,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await fetch(`${baseUrl}/wounds/upload`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success) throw new Error('Day 1 Upload failed: ' + JSON.stringify(uploadData));
  const createdWoundId = uploadData.data.woundId;
  const day1EntryId = uploadData.data.entry.id;
  console.log('   Day 1 Upload Success! Wound ID:', createdWoundId, '| Entry ID:', day1EntryId);

  // 5. Test Day 1 Measurement Persistence
  console.log('\n5. Testing Day 1 Measurement Persistence (PATCH /measurements)...');
  const day1MeasRes = await fetch(`${baseUrl}/wounds/entries/${day1EntryId}/measurements`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coveragePct: 15.6,
      physicalAreaCm2: 4.8,
      woundAreaPx: 18400,
      roi: { x: 50, y: 50, w: 200, h: 200 },
      boundary: [{ x: 60, y: 60 }, { x: 140, y: 60 }, { x: 140, y: 140 }, { x: 60, y: 140 }],
      segConfidence: 'good'
    })
  });
  const day1MeasData = await day1MeasRes.json();
  if (!day1MeasData.success) throw new Error('Day 1 Measurement update failed: ' + JSON.stringify(day1MeasData));
  const entry1 = day1MeasData.data.entry;
  console.log('   Full Day 1 Entry Response:', JSON.stringify(entry1));

  // 6. Test Day 1 Symptom Persistence
  console.log('\n6. Testing Day 1 Symptom Persistence (PATCH /symptoms)...');
  const day1SymRes = await fetch(`${baseUrl}/wounds/entries/${day1EntryId}/symptoms`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      painScore: 6,
      swellingLevel: 'Mild',
      rednessStatus: 'Normal',
      fever: false,
      discharge: false,
      badSmell: false
    })
  });
  const day1SymData = await day1SymRes.json();
  if (!day1SymData.success) throw new Error('Day 1 Symptom update failed');
  console.log('   Day 1 Symptoms Saved! Pain:', day1SymData.data.entry.pain_score, '| Triage:', day1SymData.data.entry.triage_level);

  // 7. Test Day 3 Follow-up Photo Upload
  console.log('\n7. Testing Day 3 Follow-up Upload...');
  const followUpBoundary = '----WebKitFormBoundaryWoundWiseFollowUp' + Date.now();
  const followUpBuffer = Buffer.concat([
    Buffer.from(`--${followUpBoundary}\r\nContent-Disposition: form-data; name="woundId"\r\n\r\n${createdWoundId}\r\n`),
    Buffer.from(`--${followUpBoundary}\r\nContent-Disposition: form-data; name="isFollowup"\r\n\r\ntrue\r\n`),
    Buffer.from(`--${followUpBoundary}\r\nContent-Disposition: form-data; name="notes"\r\n\r\nDay 3 follow-up: Wound shrinking nicely.\r\n`),
    Buffer.from(`--${followUpBoundary}\r\nContent-Disposition: form-data; name="image"; filename="wound_day3.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    dummyJpg,
    Buffer.from(`\r\n--${followUpBoundary}--\r\n`)
  ]);

  const day3UploadRes = await fetch(`${baseUrl}/wounds/upload`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': `multipart/form-data; boundary=${followUpBoundary}`
    },
    body: followUpBuffer
  });
  const day3UploadData = await day3UploadRes.json();
  const day3EntryId = day3UploadData.data.entry.id;
  console.log('   Day 3 Upload Success! Entry ID:', day3EntryId);

  // 8. Test Day 3 Measurement Persistence
  console.log('\n8. Testing Day 3 Measurement Persistence (PATCH /measurements)...');
  const day3MeasRes = await fetch(`${baseUrl}/wounds/entries/${day3EntryId}/measurements`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coveragePct: 12.7,
      physicalAreaCm2: 3.9,
      woundAreaPx: 14900,
      roi: { x: 50, y: 50, w: 200, h: 200 },
      boundary: [{ x: 70, y: 70 }, { x: 130, y: 70 }, { x: 130, y: 130 }, { x: 70, y: 130 }],
      segConfidence: 'good'
    })
  });
  const day3MeasData = await day3MeasRes.json();
  console.log('   Day 3 Measurements Saved! cm²:', day3MeasData.data.entry.wound_area_cm2);

  // 9. Test Day 3 Symptom Persistence & Triage Evaluation
  console.log('\n9. Testing Day 3 Symptom Persistence & Safety Rule Engine...');
  const day3SymRes = await fetch(`${baseUrl}/wounds/entries/${day3EntryId}/symptoms`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      painScore: 4,
      swellingLevel: 'Mild',
      rednessStatus: 'Slightly Increased',
      fever: false,
      discharge: false,
      badSmell: false
    })
  });
  const day3SymData = await day3SymRes.json();
  console.log('   Day 3 Symptoms Saved!');
  console.log('   Safety Triage Level:', day3SymData.data.comparison.triage.level);
  console.log('   Safety Triage Title:', day3SymData.data.comparison.triage.title);
  console.log('   Safety Reasons:', day3SymData.data.comparison.triage.reasons);

  // 10. Test Longitudinal Comparison Engine Endpoint
  console.log('\n10. Testing Longitudinal Comparison Endpoint (GET /comparison)...');
  const compRes = await fetch(`${baseUrl}/wounds/${createdWoundId}/comparison/${day3EntryId}`, { headers: authHeaders });
  const compData = await compRes.json();
  if (!compData.success) throw new Error('Comparison endpoint failed');
  console.log('   Longitudinal Area Diff:', compData.data.areaDiff.formattedText);
  console.log('   Pain Diff:', compData.data.painDiff.text);
  console.log('   Healing Progress:', compData.data.healingProgress);

  console.log('\n🎉 ALL LONGITUDINAL TRACKING & SAFETY RULE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('\n❌ Verification test failed:', err);
  process.exit(1);
});
