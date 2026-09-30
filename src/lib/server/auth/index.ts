import { db } from '../db/index.js';
import { usersTable, sessionsTable } from '../db/schema.js';
import { eq, lt } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string) {
	const sessionId = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN_MS);

	await db.insert(sessionsTable).values({
		id: sessionId,
		userId,
		expiresAt
	});

	return sessionId;
}

export async function validateSession(sessionId: string) {
	const session = await db.query.sessionsTable.findFirst({
		where: eq(sessionsTable.id, sessionId)
	});

	if (!session) return null;

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
		return null;
	}

	const user = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, session.userId)
	});

	if (!user || !user.isActive) return null;

	return user;
}

export async function invalidateSession(sessionId: string) {
	await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
}

/** Housekeeping: drop expired sessions (call opportunistically on login). */
export async function purgeExpiredSessions() {
	await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}

export async function verifyPassword(password: string, hash: string) {
	return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
	return bcrypt.hash(password, 10);
}
