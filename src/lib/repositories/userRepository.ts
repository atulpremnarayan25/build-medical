import type { User } from '$lib/types/index.js';

export type CreateUserInput = Omit<User, 'id' | 'lastActiveAt' | 'createdAt'>;

export interface UserRepository {
	getAll(): Promise<User[]>;
	getById(id: string): Promise<User | null>;
	getByUsername(username: string): Promise<User | null>;
	create(input: CreateUserInput): Promise<User>;
	update(id: string, input: Partial<CreateUserInput>): Promise<User>;
}
