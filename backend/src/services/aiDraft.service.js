import OpenAI from 'openai';
import { buildAiProfileJobContext } from '../lib/aiContextAssembler.js';

function truncateText(value, maxLength) {
  const text = typeof value === 'string' ? value : '';
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}... [truncated]`;
}

function createOpenAiClient() {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  return new OpenAI({ apiKey: OPENAI_KEY });
}

export async function generateAiDraft({ profile, job, type }) {
  if (type !== 'resume' && type !== 'coverLetter') {
    throw new Error('Unsupported draft type');
  }

  const { profileContext, jobContext } = buildAiProfileJobContext(profile, job);
  const cappedProfileContext = truncateText(profileContext, 3000);
  const cappedJobContext = truncateText(jobContext, 6000);
  const isCoverLetter = type === 'coverLetter';
  const promptLines = [
    isCoverLetter
      ? 'Write a concise cover letter draft tailored to the target job posting and user profile.'
      : 'Write a concise resume draft that highlights the user profile and the target job posting.',
    isCoverLetter
      ? 'Focus on motivation, relevant strengths, and fit for the role in a professional tone.'
      : 'Use profile details to tailor the experience and skills to the position.',
    '',
    'Profile context:',
    cappedProfileContext || 'No profile details available.',
    '',
    'Job context:',
    cappedJobContext || 'No job details available.',
    '',
    isCoverLetter
      ? 'Return the cover letter draft as plain text only.'
      : 'Return the resume draft as plain text only.',
  ];

  const prompt = promptLines.join('\n');

  const openai = createOpenAiClient();
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    max_output_tokens: 450,
    temperature: 0.7,
  });

  const text = response.output_text ?? response.output?.[0]?.content?.[0]?.text;
  if (!text) {
    throw new Error('AI did not return a draft');
  }

  return text.trim();
}

export async function rewriteAiDraft({ profile, job, type, text, instruction }) {
  if (type !== 'resume' && type !== 'coverLetter') {
    throw new Error('Unsupported draft type');
  }

  const draftText = typeof text === 'string' ? text.trim() : '';
  if (!draftText) {
    throw new Error('Draft text is required');
  }

  const { profileContext, jobContext } = buildAiProfileJobContext(profile, job);
  const cappedProfileContext = truncateText(profileContext, 3000);
  const cappedJobContext = truncateText(jobContext, 6000);
  const cappedDraftText = truncateText(draftText, 6000);
  const cappedInstruction = truncateText(
    typeof instruction === 'string' ? instruction.trim() : '',
    1200
  );
  const isCoverLetter = type === 'coverLetter';

  const promptLines = [
    isCoverLetter
      ? 'Rewrite and improve the existing cover letter draft using the profile and job context.'
      : 'Rewrite and improve the existing resume draft using the profile and job context.',
    'Preserve truthful facts from the profile and the original draft.',
    'Do not invent or exaggerate experience, responsibilities, skills, education, or credentials.',
    cappedInstruction
      ? `User rewrite instruction: ${cappedInstruction}`
      : 'User rewrite instruction: Improve clarity, impact, and job relevance while keeping facts accurate.',
    '',
    'Profile context:',
    cappedProfileContext || 'No profile details available.',
    '',
    'Job context:',
    cappedJobContext || 'No job details available.',
    '',
    'Current draft to rewrite:',
    cappedDraftText,
    '',
    isCoverLetter
      ? 'Return only the rewritten cover letter draft as plain text.'
      : 'Return only the rewritten resume draft as plain text.',
  ];

  const prompt = promptLines.join('\n');

  const openai = createOpenAiClient();
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    max_output_tokens: 550,
    temperature: 0.5,
  });

  const rewrittenText = response.output_text ?? response.output?.[0]?.content?.[0]?.text;
  if (!rewrittenText) {
    throw new Error('AI did not return a rewritten draft');
  }

  return rewrittenText.trim();
}
