#!/usr/bin/env node
/**
 * One-off migration script: consolidate legacy per-category-per-month Budget
 * docs (old shape: { userId, categoryId, month, year, amount, spent, ... })
 * into the new overall+allocations shape:
 *   { userId, month, year, amount, allocations: [{ categoryId, amount }], createdAt, updatedAt }
 *
 * This is NOT part of the app bundle (lives outside src/, vite.config.ts has
 * no reference to scripts/). Run with Node directly:
 *
 *   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json node scripts/migrate-budgets.js
 *   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json node scripts/migrate-budgets.js --confirm
 *
 * Flags:
 *   --dry-run   Default behavior. Logs planned changes, writes/deletes nothing.
 *   --confirm   Required to actually perform writes/deletes. Overrides --dry-run.
 *
 * Requires the FIREBASE_SERVICE_ACCOUNT_PATH env var to point at a Firebase
 * Admin SDK service account JSON key file. No credentials are read from or
 * written to this repo.
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const BUDGETS_COLLECTION = 'budgets';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const dryRun = !confirm;

function loadServiceAccount() {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) {
    console.error(
      'Missing FIREBASE_SERVICE_ACCOUNT_PATH env var. Set it to the path of your ' +
      'Firebase Admin SDK service account JSON key before running this script.'
    );
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read/parse service account file at ${path}:`, err.message);
    process.exit(1);
  }
}

function isOldShape(data) {
  // New-shape docs have `allocations`; old-shape docs have `categoryId` and no `allocations`.
  return Object.prototype.hasOwnProperty.call(data, 'categoryId') &&
         !Object.prototype.hasOwnProperty.call(data, 'allocations');
}

function isNewShape(data) {
  return Object.prototype.hasOwnProperty.call(data, 'allocations');
}

function groupKey(userId, month, year) {
  return `${userId}|${month}|${year}`;
}

async function main() {
  console.log(`\nBudget migration script — mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (writing + deleting)'}\n`);

  const serviceAccount = loadServiceAccount();
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const snapshot = await db.collection(BUDGETS_COLLECTION).get();
  console.log(`Inspected ${snapshot.size} total docs in '${BUDGETS_COLLECTION}'.`);

  const oldDocs = [];
  const newShapeGroups = new Set();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (isOldShape(data)) {
      oldDocs.push({ id: docSnap.id, ...data });
    } else if (isNewShape(data)) {
      newShapeGroups.add(groupKey(data.userId, data.month, data.year));
    }
  });

  console.log(`Found ${oldDocs.length} old-shape docs (have 'categoryId', no 'allocations').`);

  if (oldDocs.length === 0) {
    console.log('Nothing to migrate. Exiting.');
    return;
  }

  // Group old docs by userId + month + year
  const groups = new Map();
  for (const doc of oldDocs) {
    const key = groupKey(doc.userId, doc.month, doc.year);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  console.log(`Grouped into ${groups.size} user/month/year buckets.\n`);

  const plan = [];
  const skipped = [];

  for (const [key, docs] of groups) {
    const [userId, monthStr, yearStr] = key.split('|');
    const month = Number(monthStr);
    const year = Number(yearStr);

    if (newShapeGroups.has(key)) {
      skipped.push({ key, reason: 'A new-shape budget doc already exists for this user/month/year', docs });
      continue;
    }

    const allocations = docs.map((d) => ({
      categoryId: d.categoryId,
      amount: typeof d.amount === 'number' ? d.amount : Number(d.amount) || 0,
    }));
    const overallAmount = allocations.reduce((sum, a) => sum + a.amount, 0);
    const earliestCreatedAt = docs.reduce((earliest, d) => {
      const created = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      return !earliest || created < earliest ? created : earliest;
    }, null);

    plan.push({
      userId,
      month,
      year,
      amount: overallAmount,
      allocations,
      createdAt: earliestCreatedAt || new Date(),
      oldDocIds: docs.map((d) => d.id),
    });
  }

  // --- Summary: before ---
  console.log('=== BEFORE ===');
  for (const [key, docs] of groups) {
    const [userId, month, year] = key.split('|');
    console.log(`  user=${userId} ${month}/${year}: ${docs.length} old doc(s) -> ${docs.map((d) => `${d.categoryId}:${d.amount}`).join(', ')}`);
  }

  if (skipped.length > 0) {
    console.log('\n=== SKIPPED (new-shape doc already exists for this bucket) ===');
    for (const s of skipped) {
      console.log(`  ${s.key}: ${s.docs.length} old doc(s) left untouched — resolve manually`);
    }
  }

  console.log('\n=== AFTER (planned) ===');
  for (const p of plan) {
    console.log(
      `  user=${p.userId} ${p.month}/${p.year}: new doc { amount: ${p.amount}, allocations: [${p.allocations
        .map((a) => `${a.categoryId}:${a.amount}`)
        .join(', ')}] }, deleting ${p.oldDocIds.length} old doc(s): [${p.oldDocIds.join(', ')}]`
    );
  }

  console.log(`\nPlanned: ${plan.length} new doc(s) created, ${plan.reduce((n, p) => n + p.oldDocIds.length, 0)} old doc(s) deleted.`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.length} bucket(s) with pre-existing new-shape docs (${skipped.reduce((n, s) => n + s.docs.length, 0)} old doc(s) left in place).`);
  }

  if (dryRun) {
    console.log('\nDry run only — no writes or deletes were performed. Re-run with --confirm to apply.');
    return;
  }

  console.log('\nApplying changes...');
  let created = 0;
  let deleted = 0;

  for (const p of plan) {
    const newDocRef = db.collection(BUDGETS_COLLECTION).doc();
    const batch = db.batch();
    batch.set(newDocRef, {
      userId: p.userId,
      month: p.month,
      year: p.year,
      amount: p.amount,
      allocations: p.allocations,
      createdAt: p.createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const oldId of p.oldDocIds) {
      batch.delete(db.collection(BUDGETS_COLLECTION).doc(oldId));
    }
    await batch.commit();
    created += 1;
    deleted += p.oldDocIds.length;
    console.log(`  ✓ user=${p.userId} ${p.month}/${p.year}: wrote ${newDocRef.id}, deleted ${p.oldDocIds.length} old doc(s)`);
  }

  console.log(`\nDone. Created ${created} new doc(s), deleted ${deleted} old doc(s).`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
