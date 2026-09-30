import type { UserRepository, CreateUserInput } from '$lib/repositories/userRepository.js';
import type { User } from '$lib/types/index.js';

export function createUserService(repo: UserRepository) {
	return {
		async getUsers(): Promise<User[]> {
			return repo.getAll();
		},

		async getUser(id: string): Promise<User | null> {
			return repo.getById(id);
		},

		async getUserByUsername(username: string): Promise<User | null> {
			return repo.getByUsername(username);
		},

		async createUser(input: CreateUserInput): Promise<User> {
			return repo.create(input);
		},

		async updateUser(id: string, input: Partial<CreateUserInput>): Promise<User> {
			return repo.update(id, input);
		}
	};
}
