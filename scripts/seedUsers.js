/**
 * SmartCare — Firebase user seed script
 *
 * Creates the 3 role accounts in Firebase Auth and their profiles in Firestore.
 * Run once from your terminal:
 *
 *   node scripts/seedUsers.js
 *
 * Prerequisites:
 *   - scripts/serviceAccountKey.json must exist (downloaded from Firebase Console
 *     → Project Settings → Service Accounts → Generate new private key)
 *   - firebase-admin must be installed (npm install firebase-admin --save-dev)
 */

require('dotenv').config();

// firebase-admin v13 uses flat named exports
const {
  initializeApp,
  cert,
  getAuth,
  getFirestore,
  FieldValue,
} = (() => {
  const admin      = require('firebase-admin/app');
  const authMod    = require('firebase-admin/auth');
  const fsMod      = require('firebase-admin/firestore');
  return {
    initializeApp: admin.initializeApp,
    cert:          admin.cert,
    getAuth:       authMod.getAuth,
    getFirestore:  fsMod.getFirestore,
    FieldValue:    fsMod.FieldValue,
  };
})();

const path           = require('path');
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);
const db   = getFirestore(app);

const USERS = [
  {
    email:       'doctor@smartcare.app',
    password:    'Doctor#2026',
    username:    'doctor',
    role:        'doctor',
    facility:    'UTH Lusaka',
    displayName: 'Dr. Mulenga Banda',
  },
  {
    email:       'nurse@smartcare.app',
    password:    'Nurse#2026',
    username:    'nurse',
    role:        'nurse',
    facility:    'UTH Lusaka',
    displayName: 'Nurse Chanda Phiri',
  },
  {
    email:       'admin@smartcare.app',
    password:    'Admin#2026',
    username:    'admin',
    role:        'admin',
    facility:    'Ministry of Health HQ',
    displayName: 'Admin User ',
  },
];

async function seed() {
  console.log('🌱  Seeding SmartCare users...\n');

  for (const user of USERS) {
    try {
      let uid;

      // Create or update the Firebase Auth account
      try {
        const existing = await auth.getUserByEmail(user.email);
        uid = existing.uid;
        await auth.updateUser(uid, {
          password:    user.password,
          displayName: user.displayName,
        });
        console.log(`✅  Updated Auth user: ${user.email}  (uid: ${uid})`);
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          const created = await auth.createUser({
            email:       user.email,
            password:    user.password,
            displayName: user.displayName,
          });
          uid = created.uid;
          console.log(`✅  Created Auth user: ${user.email}  (uid: ${uid})`);
        } else {
          throw e;
        }
      }

      // Write the Firestore profile doc
      await db.collection('users').doc(uid).set({
        uid,
        email:       user.email,
        username:    user.username,
        role:        user.role,
        facility:    user.facility,
        displayName: user.displayName,
        createdAt:   FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`   └─ Firestore profile written for ${user.username} (${user.role})\n`);

    } catch (err) {
      console.error(`❌  Failed for ${user.email}:`, err.message);
    }
  }

  console.log('✅  Seeding complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
