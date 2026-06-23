import UsersDAO from '../dao/usersDAO.js';

// Which fields each profile section owns. The whitelist is also the
// ownership guard: keys not listed here (firebaseUid, email, etc.) can
// never be written, no matter what the request body contains.
const SECTION_FIELDS = {
  identity: ['firstName', 'lastName', 'phone', 'city', 'state'],
  summary: ['summary'],
};

// Per-section validation. Each returns a field-keyed errors object.
const SECTION_VALIDATORS = {
  identity: (body) => {
    const errors = {};
    if (!body.firstName?.trim()) errors.firstName = 'First name is required';
    if (!body.lastName?.trim()) errors.lastName = 'Last name is required';
    if (body.phone && !/^\d{10}$/.test(body.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    return errors;
  },
  summary: (body) => {
    const errors = {};
    if (!body.summary?.trim()) errors.summary = 'Summary is required';
    return errors;
  },
};

export default class ProfileController {
  static async apiGetProfile(req, res) {
    try {
      const profile = await UsersDAO.getProfile(req.user.uid);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.status(200).json({ profile });
    } catch (error) {
      console.error('apiGetProfile error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  // Legacy whole-profile save. Kept intact so S1 behavior and its tests
  // are untouched. The frontend no longer calls it after this ticket.
  static async apiUpdateProfile(req, res) {
    try {
      const { firstName, lastName, phone, city, state, summary } = req.body;

      const errors = {};

      if (!firstName?.trim()) errors.firstName = 'First name is required';
      if (!lastName?.trim()) errors.lastName = 'Last name is required';
      if (!summary?.trim()) errors.summary = 'Summary is required';
      if (phone && !/^\d{10}$/.test(phone)) {
        errors.phone = 'Phone number must be exactly 10 digits';
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
      }

      const updates = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() ?? '',
        city: city?.trim() ?? '',
        state: state?.trim() ?? '',
        summary: summary.trim(),
      };

      await UsersDAO.updateProfile(req.user.uid, updates);
      const profile = await UsersDAO.getProfile(req.user.uid);

      return res.status(200).json({ profile });
    } catch (error) {
      console.error('apiUpdateProfile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // S2-020 — independent per-section save with field-level validation.
  static async apiUpdateProfileSection(req, res) {
    try {
      const { section } = req.params;

      const allowedFields = SECTION_FIELDS[section];
      const validate = SECTION_VALIDATORS[section];

      if (!allowedFields || !validate) {
        return res.status(404).json({ error: 'Unknown profile section' });
      }

      const errors = validate(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
      }

      // Only this section's whitelisted fields are written. DAO uses
      // $set, so untouched sections (and identity/email) are preserved.
      const updates = {};
      for (const field of allowedFields) {
        const value = req.body[field];
        updates[field] = typeof value === 'string' ? value.trim() : value ?? '';
      }

      await UsersDAO.updateProfile(req.user.uid, updates);
      const profile = await UsersDAO.getProfile(req.user.uid);

      return res.status(200).json({ profile });
    } catch (error) {
      console.error('apiUpdateProfileSection error:', error);
      return res.status(500).json({ error: 'Failed to update profile section' });
    }
  }
}