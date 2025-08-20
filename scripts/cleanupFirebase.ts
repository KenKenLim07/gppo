import 'dotenv/config';
import { initializeApp, applicationDefault, cert, ServiceAccount } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import fs from 'fs';

// Load service account from env path or inline JSON
const serviceAccountPath = process.env.GSERVICE_ACCOUNT_PATH || '';
const serviceAccountJson = process.env.GSERVICE_ACCOUNT_JSON || '';

let credential;
if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
	credential = cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccount);
} else if (serviceAccountJson) {
	credential = cert(JSON.parse(serviceAccountJson) as ServiceAccount);
} else {
	credential = applicationDefault();
}

const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
	console.error('FIREBASE_DATABASE_URL is required');
	process.exit(1);
}

initializeApp({ credential, databaseURL });

async function removePath(path: string) {
	const db = getDatabase();
	console.log(`Deleting node: ${path}`);
	await db.ref(path).remove();
	console.log(`Deleted: ${path}`);
}

async function main() {
	try {
		// Hard-delete audit/admin logs
		await removePath('auditLogs').catch(() => console.log('auditLogs not found'));
		await removePath('adminLogs').catch(() => console.log('adminLogs not found'));

		// Optional: delete emergencyNotifications if you want to reset
		if (process.env.CLEAN_EMERGENCY_NOTIFICATIONS === 'true') {
			await removePath('emergencyNotifications').catch(() => console.log('emergencyNotifications not found'));
		}

		// Optional: delete legacy auditLog (singular)
		await removePath('auditLog').catch(() => console.log('auditLog (legacy) not found'));

		console.log('Cleanup completed.');
		process.exit(0);
	} catch (err) {
		console.error('Cleanup failed:', err);
		process.exit(1);
	}
}

main(); 