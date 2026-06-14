import UsersDAO from '../dao/usersDAO.js';

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

  static async apiUpdateProfile(req, res) {
    try {
      const { fullName, phone, location, summary } = req.body;

      const errors = {};
      if (!fullName?.trim()) {
        errors.fullName = 'Full name is required';
      }
      if (!summary?.trim()) {
        errors.summary = 'Summary is required';
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
      }

      // Only baseline fields are written. firebaseUid/email/displayName are never
      // pulled from the body, so a user cannot overwrite their identity fields.
      const updates = {
        fullName: fullName.trim(),
        phone: phone?.trim() ?? '',
        location: location?.trim() ?? '',
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
}