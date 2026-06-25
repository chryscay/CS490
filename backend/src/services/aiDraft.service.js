import OpenAI from 'openai';
import { buildAiProfileJobContext } from '../lib/aiContextAssembler.js';

function createOpenAiClient() {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  return new OpenAI({ apiKey: OPENAI_KEY });
}

export async function generateAiDraft({ profile, job, type }) {
  if (type !== 'resume') {
    throw new Error('Unsupported draft type');
  }

  const { profileContext, jobContext } = buildAiProfileJobContext(profile, job);
  const promptLines = [
    'Write a concise resume draft that highlights the user profile and the target job posting.',
    'Use profile details to tailor the experience and skills to the position.',
    '',
    'Profile context:',
    profileContext || 'No profile details available.',
    '',
    'Job context:',
    jobContext || 'No job details available.',
    '',
    'Return the resume draft as plain text only.',
  ];

  const prompt = promptLines.join('\n');

  const openai = createOpenAiClient();
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    max_tokens: 450,
    temperature: 0.7,
  });

  const text = response.output_text ?? response.output?.[0]?.content?.[0]?.text;
  if (!text) {
    throw new Error('AI did not return a draft');
  }

  return text.trim();
}
