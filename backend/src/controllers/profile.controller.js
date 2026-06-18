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
      const { firstName, lastName, phone, city, state, summary } = req.body;

      const errors = {};

      if (!firstName?.trim()) {
        errors.firstName = 'First name is required';
      }

      if (!lastName?.trim()) {
        errors.lastName = 'Last name is required';
      }

      if (!summary?.trim()) {
        errors.summary = 'Summary is required';
      }

      // optional phone validation
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
}
