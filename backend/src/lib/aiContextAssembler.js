function normalizeText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function joinValues(values) {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => (typeof value === 'string' ? value.length > 0 : Boolean(value)))
    .join(' | ');
}

export function buildAiProfileJobContext(profile = {}, job = {}) {
  const profileLines = [];

  const fullName = joinValues([profile.firstName, profile.lastName]);
  if (fullName) {
    profileLines.push(`Name: ${fullName}`);
  }

  const location = joinValues([profile.city, profile.state]);
  if (location) {
    profileLines.push(`Location: ${location}`);
  }

  const summary = normalizeText(profile.summary);
  if (summary) {
    profileLines.push(`Summary: ${summary}`);
  }

  if (Array.isArray(profile.skills) && profile.skills.length > 0) {
    const skillNames = profile.skills
      .map((skill) => normalizeText(skill?.name) || normalizeText(skill))
      .filter(Boolean);
    if (skillNames.length > 0) {
      profileLines.push(`Skills: ${skillNames.join(', ')}`);
    }
  }

  if (Array.isArray(profile.education) && profile.education.length > 0) {
    const educationLines = profile.education
      .map((edu) => {
        const school = normalizeText(edu.schoolName);
        const degree = normalizeText(edu.degree);
        const field = normalizeText(edu.fieldOfStudy);
        const dates = joinValues([edu.startDate, edu.endDate]);
        const parts = [school, degree, field, dates].filter(Boolean);
        return parts.length > 0 ? parts.join(' | ') : null;
      })
      .filter(Boolean);

    if (educationLines.length > 0) {
      profileLines.push(`Education: ${educationLines.join('; ')}`);
    }
  }

  if (profile.careerPreferences) {
    const prefs = profile.careerPreferences;
    const preferenceLines = [];

    if (Array.isArray(prefs.targetRoles) && prefs.targetRoles.length > 0) {
      const roles = prefs.targetRoles
        .map((role) => normalizeText(role?.name) || normalizeText(role))
        .filter(Boolean);
      if (roles.length > 0) {
        preferenceLines.push(`Target roles: ${roles.join(', ')}`);
      }
    }

    if (Array.isArray(prefs.locations) && prefs.locations.length > 0) {
      const locations = prefs.locations
        .map((loc) => normalizeText(loc?.name) || normalizeText(loc))
        .filter(Boolean);
      if (locations.length > 0) {
        preferenceLines.push(`Desired locations: ${locations.join(', ')}`);
      }
    }

    const workMode = normalizeText(prefs.workMode);
    if (workMode) {
      preferenceLines.push(`Work mode: ${workMode}`);
    }

    const salaryPreference = normalizeText(prefs.salaryPreference);
    if (salaryPreference) {
      preferenceLines.push(`Salary preference: ${salaryPreference}`);
    }

    if (preferenceLines.length > 0) {
      profileLines.push(`Career preferences: ${preferenceLines.join('; ')}`);
    }
  }

  const jobLines = [];
  if (normalizeText(job.title)) {
    jobLines.push(`Title: ${normalizeText(job.title)}`);
  }
  if (normalizeText(job.company)) {
    jobLines.push(`Company: ${normalizeText(job.company)}`);
  }
  if (normalizeText(job.jobPostingBody)) {
    jobLines.push(`Job posting: ${normalizeText(job.jobPostingBody)}`);
  }
  if (normalizeText(job.recruiterName)) {
    jobLines.push(`Recruiter / contact: ${normalizeText(job.recruiterName)}`);
  }
  if (normalizeText(job.contactNotes)) {
    jobLines.push(`Contact notes: ${normalizeText(job.contactNotes)}`);
  }

  return {
    profileContext: profileLines.join('\n'),
    jobContext: jobLines.join('\n'),
  };
}
