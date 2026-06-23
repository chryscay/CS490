import { vi, describe, it, expect, beforeEach } from 'vitest';
import UsersDAO from './dao/usersDAO.js';

// Test the REAL DAO here (not mocked) — mock the Mongo collection it talks to
// so we can assert how updateOne is invoked.
const mockUpdateOne = vi.fn();

const mockConn = {
  db: () => ({
    collection: () => ({
      updateOne: mockUpdateOne,
    }),
  }),
};

describe('UsersDAO.updateProfile', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await UsersDAO.injectDB(mockConn);
  });

  it('upserts so the profile persists even when no user doc exists yet', async () => {
    // Simulate a user with no existing doc: nothing matched, one upserted.
    mockUpdateOne.mockResolvedValue({ matchedCount: 0, upsertedCount: 1 });

    await UsersDAO.updateProfile('user-a', {
      fullName: 'Ada Lovelace',
      summary: 'Mathematician',
    });

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { firebaseUid: 'user-a' },
      { $set: expect.objectContaining({
          fullName: 'Ada Lovelace',
          summary: 'Mathematician',
        }) },
      { upsert: true }
    );
  });
  
});