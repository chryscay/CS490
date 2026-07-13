import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGetIdToken = vi.fn().mockResolvedValue('faketoken');

vi.mock('../features/auth/useAuth.js', () => ({
  useAuth: () => ({
    currentUser: {
      getIdToken: mockGetIdToken,
    },
  }),
}));

vi.mock('../features/jobs/jobsApi.js', () => ({
  generateJobDraft: vi.fn(),
  rewriteJobDraft: vi.fn(),
  saveJobDocument: vi.fn(),
  getJobDocuments: vi.fn(),
  getAllDocuments: vi.fn(),
  getDocument: vi.fn(),
  linkDocumentToJob: vi.fn(),
  unlinkDocumentFromJob: vi.fn(),
  generateCompanyResearch: vi.fn(),
  updateResearchNotes: vi.fn(),
  updateInterviewPrepNotes: vi.fn(),
}));

vi.mock('../features/jobs/documentsApi.js', () => ({
  exportJobDocument: vi.fn(),
}));

import * as JobsApi from '../features/jobs/jobsApi.js';
import { waitFor } from '@testing-library/react';
import * as DocumentsApi from '../features/jobs/documentsApi.js';
import JobDetailPanel from '../features/jobs/JobDetailPanel';

const mockJob = {
  _id: 'abc123',
  title: 'Frontend Engineer',
  company: 'Acme Corp',
  stage: 'Applied',
  jobPostingBody: 'We are looking for a frontend engineer.',
  createdAt: '2026-06-01T00:00:00.000Z',
  lastActivityAt: '2026-06-10T00:00:00.000Z',
  deadline: '2026-07-15T00:00:00.000Z',
  recruiterName: 'Jane Smith',
  contactNotes: 'Follow up next week',
};

const defaultProps = {
  job: mockJob,
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onAddInterview: vi.fn(),
  onUpdateInterview: vi.fn(),
  onAddFollowUp: vi.fn(),
  onUpdateFollowUp: vi.fn(),
  onArchive: vi.fn(),
  onRestore: vi.fn(),
};

describe('JobDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('faketoken');
    JobsApi.generateJobDraft.mockResolvedValue({
      draft: 'AI resume draft text',
    });
    JobsApi.rewriteJobDraft.mockResolvedValue({
      draft: 'Improved resume draft text',
    });
    JobsApi.saveJobDocument.mockResolvedValue({
      document: { currentVersion: 1 },
    });
    JobsApi.getJobDocuments.mockResolvedValue({ documents: [] });
    JobsApi.getAllDocuments.mockResolvedValue({ documents: [] });
    JobsApi.getDocument.mockResolvedValue({ document: { text: 'Document body text', version: 1 } });
    JobsApi.linkDocumentToJob.mockResolvedValue({ job: { _id: 'abc123' } });
    JobsApi.unlinkDocumentFromJob.mockResolvedValue({ job: { _id: 'abc123' } });
    JobsApi.updateInterviewPrepNotes.mockResolvedValue({
      job: { ...mockJob, interviewPrepNotes: 'Practice STAR stories.' },
    });
    DocumentsApi.exportJobDocument.mockResolvedValue({ filename: 'Saved_Resume_v2.pdf' });
  });
  it('renders the job title', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: /frontend engineer/i })
    ).toBeInTheDocument();
  });

  // Outcome surfacing (S2-013)
  const outcomeJob = {
    ...mockJob,
    stage: 'Offer',
    stageHistory: [
      { toStage: 'Applied', note: '', changedAt: '2026-06-05T00:00:00.000Z' },
      {
        toStage: 'Offer',
        note: 'Signed offer letter',
        changedAt: '2026-06-12T00:00:00.000Z',
      },
    ],
  };

  it('renders the Outcome section with the note for a job in an outcome stage', () => {
    render(<JobDetailPanel {...defaultProps} job={outcomeJob} />);
    const section = screen.getByText('Outcome').closest('div');
    expect(
      within(section).getByText('Signed offer letter')
    ).toBeInTheDocument();
  });

  it('shows an empty outcome message when no note was recorded', () => {
    const noNote = {
      ...mockJob,
      stage: 'Rejected',
      stageHistory: [
        {
          toStage: 'Rejected',
          note: '',
          changedAt: '2026-06-12T00:00:00.000Z',
        },
      ],
    };
    render(<JobDetailPanel {...defaultProps} job={noNote} />);
    expect(screen.getByText(/no outcome note recorded/i)).toBeInTheDocument();
  });

  it('does not render the Outcome section for a non-outcome stage', () => {
    render(<JobDetailPanel {...defaultProps} />); // mockJob is 'Applied'
    expect(screen.queryByText('Outcome')).not.toBeInTheDocument();
  });

  it('renders the company name', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('renders the stage badge', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
  });

  it('renders the job posting body', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByText(/looking for a frontend engineer/i)
    ).toBeInTheDocument();
  });

  it('renders the timeline section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('list', { name: /job activity timeline/i })
    ).toBeInTheDocument();
  });

  it('renders a Job added timeline event', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Job added')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<JobDetailPanel {...defaultProps} onClose={onClose} />);
    await userEvent.click(
      screen.getByRole('button', { name: /close job details/i })
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onEdit when the Edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<JobDetailPanel {...defaultProps} onEdit={onEdit} />);
    await userEvent.click(
      screen.getByRole('button', { name: /edit frontend engineer/i })
    );
    expect(onEdit).toHaveBeenCalledWith(mockJob);
  });

  it('shows empty timeline message when there are no activity events', () => {
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, createdAt: undefined, lastActivityAt: undefined }}
      />
    );
    expect(screen.getByText(/no activity recorded yet/i)).toBeInTheDocument();
  });

  it('shows all six canonical stages correctly', () => {
    const stages = [
      'Interested',
      'Applied',
      'Interview',
      'Offer',
      'Rejected',
      'Archived',
    ];
    stages.forEach((stage) => {
      const { unmount } = render(
        <JobDetailPanel {...defaultProps} job={{ ...mockJob, stage }} />
      );
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
      unmount();
    });
  });

  // Overview section tests
  it('renders the Overview section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders core fields in the Overview section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    // Find the Overview section and verify core fields within it
    const overviewHeading = screen.getByText('Overview');
    const overviewSection = overviewHeading.closest('div');
    expect(
      within(overviewSection).getByText('Frontend Engineer')
    ).toBeInTheDocument();
    expect(within(overviewSection).getByText('Acme Corp')).toBeInTheDocument();
    expect(within(overviewSection).getByText('Applied')).toBeInTheDocument();
  });

  it('renders deadline in the Overview section when present', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Jul 15, 2026')).toBeInTheDocument();
  });

  it('renders recruiter name in the Overview section when present', () => {
    render(<JobDetailPanel {...defaultProps} />);
    const overviewHeading = screen.getByText('Overview');
    const overviewSection = overviewHeading.closest('div');
    expect(within(overviewSection).getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders contact notes in the Overview section when present', () => {
    render(<JobDetailPanel {...defaultProps} />);
    const overviewHeading = screen.getByText('Overview');
    const overviewSection = overviewHeading.closest('div');
    expect(
      within(overviewSection).getByText('Follow up next week')
    ).toBeInTheDocument();
  });

  it('does not render deadline in Overview when not present', () => {
    const jobWithoutDeadline = { ...mockJob, deadline: undefined };
    render(<JobDetailPanel {...defaultProps} job={jobWithoutDeadline} />);
    expect(screen.queryByText('Jul 15, 2026')).not.toBeInTheDocument();
  });

  it('does not render recruiter name in Overview when not present', () => {
    const jobWithoutRecruiter = { ...mockJob, recruiterName: undefined };
    render(<JobDetailPanel {...defaultProps} job={jobWithoutRecruiter} />);
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('does not render contact notes in Overview when not present', () => {
    const jobWithoutNotes = { ...mockJob, contactNotes: undefined };
    render(<JobDetailPanel {...defaultProps} job={jobWithoutNotes} />);
    expect(screen.queryByText('Follow up next week')).not.toBeInTheDocument();
  });

  // Delete workflow (SCRUM-52) — guarded by confirmation
  it('renders a Delete button', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    ).toBeInTheDocument();
  });

  it('renders a Generate resume draft button', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /generate resume draft/i })
    ).toBeInTheDocument();
  });

  it('renders a Generate cover letter draft button', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /generate cover letter draft/i })
    ).toBeInTheDocument();
  });

  it('shows editable draft textarea after generating a resume draft', async () => {
    render(<JobDetailPanel {...defaultProps} />);

    await userEvent.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );

    expect(JobsApi.generateJobDraft).toHaveBeenCalledWith(
      'abc123',
      'faketoken',
      { type: 'resume' }
    );
    expect(
      await screen.findByLabelText(/editable resume draft/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/editable resume draft/i)).toHaveValue(
      'AI resume draft text'
    );
  });

  it('calls API with type coverLetter and shows editable cover letter textarea', async () => {
    JobsApi.generateJobDraft.mockResolvedValue({
      draft: 'AI cover letter draft text',
    });
    render(<JobDetailPanel {...defaultProps} />);

    await userEvent.click(
      screen.getByRole('button', { name: /generate cover letter draft/i })
    );

    expect(JobsApi.generateJobDraft).toHaveBeenCalledWith(
      'abc123',
      'faketoken',
      {
        type: 'coverLetter',
      }
    );
    expect(
      await screen.findByLabelText(/editable cover letter draft/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/editable cover letter draft/i)).toHaveValue(
      'AI cover letter draft text'
    );
  });

  it('shows loading state while generating cover letter draft', async () => {
    let resolveDraft;
    JobsApi.generateJobDraft.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDraft = resolve;
        })
    );
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate cover letter draft/i })
    );

    expect(
      screen.getByRole('button', {
        name: /generate resume draft for frontend engineer/i,
      })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: /generate cover letter draft for frontend engineer/i,
      })
    ).toBeDisabled();

    resolveDraft({ draft: 'Later cover letter draft' });
    expect(
      await screen.findByLabelText(/editable cover letter draft/i)
    ).toBeInTheDocument();
  });

  it('shows failure message when cover letter generation fails', async () => {
    JobsApi.generateJobDraft.mockRejectedValue(
      new Error('Failed to generate draft')
    );
    render(<JobDetailPanel {...defaultProps} />);

    await userEvent.click(
      screen.getByRole('button', { name: /generate cover letter draft/i })
    );

    expect(
      await screen.findByText(/failed to generate draft/i)
    ).toBeInTheDocument();
  });

  it('hides old resume draft when cover letter generation fails after switching types', async () => {
    JobsApi.generateJobDraft
      .mockResolvedValueOnce({ draft: 'Old resume draft text' })
      .mockRejectedValueOnce(
        new Error('Could not generate cover letter draft')
      );

    render(<JobDetailPanel {...defaultProps} />);

    await userEvent.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );
    expect(await screen.findByLabelText(/editable resume draft/i)).toHaveValue(
      'Old resume draft text'
    );

    await userEvent.click(
      screen.getByRole('button', { name: /generate cover letter draft/i })
    );

    expect(
      screen.queryByDisplayValue('Old resume draft text')
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/could not generate cover letter draft/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/editable cover letter draft/i)
    ).not.toBeInTheDocument();
  });

  it('shows rewrite controls after a draft is generated', async () => {
    render(<JobDetailPanel {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /improve draft/i })
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );

    expect(
      await screen.findByRole('button', { name: /improve draft/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/rewrite instruction/i)).toBeInTheDocument();
  });

  it('calls rewriteJobDraft with current editable draft text and instruction', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );

    const draftTextarea = await screen.findByLabelText(
      /editable resume draft/i
    );
    await user.clear(draftTextarea);
    await user.type(draftTextarea, 'Current edited draft text');

    const instructionTextarea = screen.getByLabelText(/rewrite instruction/i);
    await user.type(
      instructionTextarea,
      'Make this more concise and quantified.'
    );

    await user.click(screen.getByRole('button', { name: /improve draft/i }));

    expect(JobsApi.rewriteJobDraft).toHaveBeenCalledWith(
      'abc123',
      'faketoken',
      {
        type: 'resume',
        text: 'Current edited draft text',
        instruction: 'Make this more concise and quantified.',
      }
    );
  });

  it('replaces editable draft text with rewritten output and keeps previous draft visible', async () => {
    const user = userEvent.setup();
    JobsApi.generateJobDraft.mockResolvedValue({
      draft: 'Original draft text',
    });
    JobsApi.rewriteJobDraft.mockResolvedValue({
      draft: 'Rewritten draft text',
    });

    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );
    await user.click(
      await screen.findByRole('button', { name: /improve draft/i })
    );

    expect(await screen.findByLabelText(/editable resume draft/i)).toHaveValue(
      'Rewritten draft text'
    );
    expect(
      screen.getByText(/previous draft for comparison/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Original draft text')).toBeInTheDocument();
  });

  it('shows rewrite failure and keeps current draft intact', async () => {
    const user = userEvent.setup();
    JobsApi.generateJobDraft.mockResolvedValue({ draft: 'Stable draft text' });
    JobsApi.rewriteJobDraft.mockRejectedValue(
      new Error('Failed to rewrite draft')
    );

    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );
    expect(await screen.findByLabelText(/editable resume draft/i)).toHaveValue(
      'Stable draft text'
    );

    await user.click(screen.getByRole('button', { name: /improve draft/i }));

    expect(
      await screen.findByText(/failed to rewrite draft/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/editable resume draft/i)).toHaveValue(
      'Stable draft text'
    );
  });

  it('shows Save draft button only after a draft is generated', async () => {
    render(<JobDetailPanel {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /save draft/i })
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );

    expect(
      await screen.findByRole('button', { name: /save draft/i })
    ).toBeInTheDocument();
  });

  it('saves the current edited draft text with the active draft type', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate cover letter draft/i })
    );

    const draftTextarea = await screen.findByLabelText(
      /editable cover letter draft/i
    );
    await user.clear(draftTextarea);
    await user.type(draftTextarea, 'Edited cover letter content');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(JobsApi.saveJobDocument).toHaveBeenCalledWith(
      'abc123',
      'faketoken',
      {
        type: 'coverLetter',
        title: 'Frontend Engineer Cover Letter',
        text: 'Edited cover letter content',
      }
    );
  });

  it('shows a success message with the saved version number', async () => {
    const user = userEvent.setup();
    JobsApi.saveJobDocument.mockResolvedValue({
      document: { currentVersion: 4 },
    });

    render(<JobDetailPanel {...defaultProps} />);
    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );
    await user.click(
      await screen.findByRole('button', { name: /save draft/i })
    );

    expect(await screen.findByText(/saved as version 4/i)).toBeInTheDocument();
  });

  it('shows save failure and keeps the draft visible/editable', async () => {
    const user = userEvent.setup();
    JobsApi.saveJobDocument.mockRejectedValue(
      new Error('Failed to save document')
    );

    render(<JobDetailPanel {...defaultProps} />);
    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );

    const draftTextarea = await screen.findByLabelText(
      /editable resume draft/i
    );
    await user.clear(draftTextarea);
    await user.type(draftTextarea, 'Do not lose this content');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(
      await screen.findByText(/failed to save document/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/editable resume draft/i)).toHaveValue(
      'Do not lose this content'
    );
  });

  it('disables Save draft when draft text is blank', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );

    const draftTextarea = await screen.findByLabelText(
      /editable resume draft/i
    );
    await user.clear(draftTextarea);

    expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();
  });

  it('disables Save draft while rewrite is loading', async () => {
    const user = userEvent.setup();
    let resolveRewrite;
    JobsApi.rewriteJobDraft.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRewrite = resolve;
        })
    );

    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: /generate resume draft/i })
    );
    await user.click(
      await screen.findByRole('button', { name: /improve draft/i })
    );

    expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();

    resolveRewrite({ draft: 'Rewritten draft text' });
    await screen.findByDisplayValue('Rewritten draft text');
  });

  it('does not call onDelete until the action is confirmed', async () => {
    const onDelete = vi.fn();
    render(<JobDetailPanel {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete with the job when confirmed', async () => {
    const onDelete = vi.fn();
    render(<JobDetailPanel {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /^delete job$/i })
    );
    expect(onDelete).toHaveBeenCalledWith(mockJob);
  });

  it('does not call onDelete when the confirmation is cancelled', async () => {
    const onDelete = vi.fn();
    render(<JobDetailPanel {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // Interview tracking (S2-011)
  const interviewJob = {
    ...mockJob,
    stage: 'Interview',
    interviews: [
      {
        id: 'iv-1',
        roundType: 'Technical Screen',
        scheduledAt: '2026-08-01T14:00:00.000Z',
        notes: 'Algorithms and data structures.',
      },
      {
        id: 'iv-2',
        roundType: 'System Design',
        scheduledAt: '2026-08-05T10:00:00.000Z',
        notes: 'Design a URL shortener.',
      },
    ],
  };

  it('does not render the Interviews section when stage is not Interview', () => {
    render(<JobDetailPanel {...defaultProps} />); // mockJob is 'Applied'
    expect(screen.queryByText('Interviews')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add interview/i })
    ).not.toBeInTheDocument();
  });

  it('renders the Interviews section when stage is Interview', () => {
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, stage: 'Interview' }}
      />
    );
    expect(screen.getByText('Interviews')).toBeInTheDocument();
  });

  it('renders the Add Interview button when stage is Interview', () => {
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, stage: 'Interview' }}
      />
    );
    expect(
      screen.getByRole('button', { name: /add interview/i })
    ).toBeInTheDocument();
  });

  it('shows the empty interviews message when there are no entries', () => {
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, stage: 'Interview' }}
      />
    );
    expect(screen.getByText(/no interviews recorded yet/i)).toBeInTheDocument();
  });

  it('renders existing interview entries', () => {
    render(<JobDetailPanel {...defaultProps} job={interviewJob} />);
    expect(
      screen.getByRole('list', { name: /interview list/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Technical Screen')).toBeInTheDocument();
    expect(screen.getByText('System Design')).toBeInTheDocument();
    expect(
      screen.getByText('Algorithms and data structures.')
    ).toBeInTheDocument();
  });

  it('opens the Add Interview form when the Add button is clicked', async () => {
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, stage: 'Interview' }}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /add interview/i })
    );
    expect(
      screen.getByRole('dialog', { name: /add interview/i })
    ).toBeInTheDocument();
  });

  it('opens the Edit Interview form when an interview Edit button is clicked', async () => {
    render(<JobDetailPanel {...defaultProps} job={interviewJob} />);
    await userEvent.click(
      screen.getByRole('button', { name: /edit technical screen interview/i })
    );
    expect(
      screen.getByRole('dialog', { name: /edit interview/i })
    ).toBeInTheDocument();
  });

  it('calls onUpdateInterview when the edit interview form is submitted', async () => {
    const onUpdateInterview = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <JobDetailPanel
        {...defaultProps}
        job={interviewJob}
        onUpdateInterview={onUpdateInterview}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /edit technical screen interview/i })
    );
    const formDialog = screen.getByRole('dialog', { name: /edit interview/i });
    await user.clear(
      within(formDialog).getByRole('textbox', { name: /notes/i })
    );
    await user.type(
      within(formDialog).getByRole('textbox', { name: /notes/i }),
      'Updated notes.'
    );
    await user.click(
      within(formDialog).getByRole('button', { name: /save changes/i })
    );

    expect(onUpdateInterview).toHaveBeenCalledWith(
      'iv-1',
      expect.objectContaining({ notes: 'Updated notes.' })
    );
  });

  it('calls onAddInterview with entry when the form is submitted', async () => {
    const onAddInterview = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, stage: 'Interview' }}
        onAddInterview={onAddInterview}
      />
    );

    await user.click(screen.getByRole('button', { name: /add interview/i }));

    const formDialog = screen.getByRole('dialog', { name: /add interview/i });
    await user.selectOptions(
      within(formDialog).getByRole('combobox', { name: /round type/i }),
      'Behavioral'
    );
    await user.type(
      within(formDialog).getByLabelText(/date.*time/i),
      '2026-08-10T09:00'
    );
    await user.type(
      within(formDialog).getByRole('textbox', { name: /notes/i }),
      'Star method questions.'
    );
    await user.click(
      within(formDialog).getByRole('button', { name: /add interview/i })
    );

    expect(onAddInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        roundType: 'Behavioral',
        scheduledAt: expect.any(String),
        notes: 'Star method questions.',
      })
    );
  });
});

describe('JobDetailPanel — Saved Drafts (SCRUM-64)', () => {
  const savedDocuments = [
    {
      _id: 'doc-1',
      type: 'resume',
      title: 'Frontend Engineer Resume',
      currentVersion: 2,
      text: 'Saved resume body text',
      updatedAt: '2026-06-20T00:00:00.000Z',
    },
  ];

  it('renders the Saved Drafts section from persisted documents', async () => {
    JobsApi.getJobDocuments.mockResolvedValue({ documents: savedDocuments });
    render(<JobDetailPanel {...defaultProps} />);

    expect(await screen.findByText('Saved Drafts')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer Resume')).toBeInTheDocument();
    expect(JobsApi.getJobDocuments).toHaveBeenCalledWith('abc123', 'faketoken');
  });

  it('loads a saved draft into the editable draft area', async () => {
    const user = userEvent.setup();
    JobsApi.getJobDocuments.mockResolvedValue({ documents: savedDocuments });
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      await screen.findByRole('button', { name: /load saved resume draft/i })
    );
    expect(
      await screen.findByLabelText(/editable resume draft/i)
    ).toHaveValue('Saved resume body text');
  });

  it('renders no Saved Drafts section when there are none', async () => {
    JobsApi.getJobDocuments.mockResolvedValue({ documents: [] });
    render(<JobDetailPanel {...defaultProps} />);
    await screen.findByText('Overview');
    expect(screen.queryByText('Saved Drafts')).not.toBeInTheDocument();
  });

  it('re-fetches and replaces saved drafts when switching to a different job', async () => {
    const nextJob = {
      ...mockJob,
      _id: 'job-2',
      title: 'Backend Engineer',
      company: 'Globex',
    };

    JobsApi.getJobDocuments
      .mockResolvedValueOnce({
        documents: [
          {
            _id: 'doc-a',
            type: 'resume',
            title: 'Frontend Engineer Resume',
            currentVersion: 1,
            text: 'frontend draft',
            updatedAt: '2026-06-21T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        documents: [
          {
            _id: 'doc-b',
            type: 'coverLetter',
            title: 'Backend Engineer Cover Letter',
            currentVersion: 2,
            text: 'backend draft',
            updatedAt: '2026-06-22T00:00:00.000Z',
          },
        ],
      });

    const { rerender } = render(<JobDetailPanel {...defaultProps} />);
    expect(await screen.findByText('Frontend Engineer Resume')).toBeInTheDocument();

    rerender(<JobDetailPanel {...defaultProps} job={nextJob} />);

    expect(await screen.findByText('Backend Engineer Cover Letter')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer Resume')).not.toBeInTheDocument();
    expect(JobsApi.getJobDocuments).toHaveBeenCalledWith('abc123', 'faketoken');
    expect(JobsApi.getJobDocuments).toHaveBeenCalledWith('job-2', 'faketoken');
  });

  it('downloads the selected saved draft for the current job and owner token', async () => {
    const user = userEvent.setup();
    JobsApi.getJobDocuments.mockResolvedValue({ documents: savedDocuments });
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      await screen.findByRole('button', { name: /download saved resume as pdf/i })
    );

    expect(DocumentsApi.exportJobDocument).toHaveBeenCalledWith(
      'abc123',
      'doc-1',
      'faketoken',
      { format: 'pdf' }
    );
  });

  it('surfaces export errors while keeping saved drafts visible', async () => {
    const user = userEvent.setup();
    JobsApi.getJobDocuments.mockResolvedValue({ documents: savedDocuments });
    DocumentsApi.exportJobDocument.mockRejectedValueOnce(new Error('Document version not found'));
    render(<JobDetailPanel {...defaultProps} />);

    await user.click(
      await screen.findByRole('button', { name: /download saved resume as pdf/i })
    );

    expect(await screen.findByText('Document version not found')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer Resume')).toBeInTheDocument();
  });
});

describe('JobDetailPanel — Follow-ups (S2-BR-012)', () => {
  const followUpJob = {
    ...mockJob,
    followUps: [
      {
        id: 'fu-1',
        title: 'Send thank you email',
        dueAt: '2026-08-03T09:00:00.000Z',
        completedAt: null,
        createdAt: '2026-07-20T00:00:00.000Z',
      },
      {
        id: 'fu-2',
        title: 'Check portal status',
        dueAt: '2026-08-10T10:00:00.000Z',
        completedAt: '2026-08-04T12:00:00.000Z',
        createdAt: '2026-07-21T00:00:00.000Z',
      },
    ],
  };

  it('always renders the Follow-ups section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /add follow-up/i })
    ).toBeInTheDocument();
  });

  it('renders the Add Follow-up button', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /add follow-up/i })
    ).toBeInTheDocument();
  });

  it('shows empty message when there are no follow-ups', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText(/no follow-ups yet/i)).toBeInTheDocument();
  });

  it('renders existing follow-up entries', () => {
    render(<JobDetailPanel {...defaultProps} job={followUpJob} />);
    expect(
      screen.getByRole('list', { name: /follow-up list/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Send thank you email')).toBeInTheDocument();
    expect(screen.getByText('Check portal status')).toBeInTheDocument();
  });

  it('opens the Add Follow-up form when Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /add follow-up/i }));
    expect(
      screen.getByRole('dialog', { name: /add follow-up/i })
    ).toBeInTheDocument();
  });

  it('opens the Edit Follow-up form when an edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} job={followUpJob} />);
    await user.click(
      screen.getByRole('button', {
        name: /edit follow-up "send thank you email"/i,
      })
    );
    expect(
      screen.getByRole('dialog', { name: /edit follow-up/i })
    ).toBeInTheDocument();
  });

  it('calls onAddFollowUp when the form is submitted', async () => {
    const onAddFollowUp = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} onAddFollowUp={onAddFollowUp} />);

    await user.click(screen.getByRole('button', { name: /add follow-up/i }));
    const dialog = screen.getByRole('dialog', { name: /add follow-up/i });

    await user.type(
      within(dialog).getByLabelText(/title/i),
      'Follow up on application'
    );
    await user.type(
      within(dialog).getByLabelText(/due date/i),
      '2026-08-05T10:00'
    );
    await user.click(
      within(dialog).getByRole('button', { name: /add follow-up/i })
    );

    expect(onAddFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Follow up on application',
        dueAt: expect.any(String),
      })
    );
  });

  it('calls onUpdateFollowUp when the edit form is submitted', async () => {
    const onUpdateFollowUp = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <JobDetailPanel
        {...defaultProps}
        job={followUpJob}
        onUpdateFollowUp={onUpdateFollowUp}
      />
    );

    await user.click(
      screen.getByRole('button', {
        name: /edit follow-up "send thank you email"/i,
      })
    );
    const dialog = screen.getByRole('dialog', { name: /edit follow-up/i });

    await user.clear(within(dialog).getByLabelText(/title/i));
    await user.type(within(dialog).getByLabelText(/title/i), 'Updated title');
    await user.click(
      within(dialog).getByRole('button', { name: /save changes/i })
    );

    expect(onUpdateFollowUp).toHaveBeenCalledWith(
      'fu-1',
      expect.objectContaining({ title: 'Updated title' })
    );
  });
});

describe('JobDetailPanel — Timeline (S2-BR-013)', () => {
  it('includes stage history entries in the timeline', () => {
    const jobWithHistory = {
      ...mockJob,
      stageHistory: [
        {
          id: 'sh-1',
          toStage: 'Applied',
          changedAt: '2026-06-05T00:00:00.000Z',
        },
        {
          id: 'sh-2',
          toStage: 'Interview',
          changedAt: '2026-06-15T00:00:00.000Z',
        },
      ],
    };
    render(<JobDetailPanel {...defaultProps} job={jobWithHistory} />);
    expect(screen.getByText(/moved to applied/i)).toBeInTheDocument();
    expect(screen.getByText(/moved to interview/i)).toBeInTheDocument();
  });

  it('includes follow-up creation events in the timeline', () => {
    const jobWithFollowUps = {
      ...mockJob,
      followUps: [
        {
          id: 'fu-1',
          title: 'Send thank you email',
          dueAt: '2026-08-03T09:00:00.000Z',
          completedAt: null,
          createdAt: '2026-07-20T00:00:00.000Z',
        },
      ],
    };
    render(<JobDetailPanel {...defaultProps} job={jobWithFollowUps} />);
    expect(
      screen.getByText(/follow-up added: send thank you email/i)
    ).toBeInTheDocument();
  });

  it('includes follow-up completion events in the timeline', () => {
    const jobWithCompleted = {
      ...mockJob,
      followUps: [
        {
          id: 'fu-1',
          title: 'Send thank you email',
          dueAt: '2026-08-03T09:00:00.000Z',
          completedAt: '2026-08-05T12:00:00.000Z',
          createdAt: '2026-07-20T00:00:00.000Z',
        },
      ],
    };
    render(<JobDetailPanel {...defaultProps} job={jobWithCompleted} />);
    expect(
      screen.getByText(/follow-up completed: send thank you email/i)
    ).toBeInTheDocument();
  });

  it('shows interview events in the timeline', () => {
    const jobWithInterview = {
      ...mockJob,
      interviews: [
        {
          id: 'interview-1',
          roundType: 'Phone Screen',
          scheduledAt: '2026-06-27T15:00:00.000Z',
        },
      ],
    };

    render(<JobDetailPanel {...defaultProps} job={jobWithInterview} />);

    expect(screen.getByText('Interview: Phone Screen')).toBeInTheDocument();
  });
});

describe('JobDetailPanel — Linked Documents (S3-009)', () => {
  const libraryDocs = [
    { _id: 'lib-resume-1', type: 'resume', title: 'My Resume', currentVersion: 2, status: 'active' },
    { _id: 'lib-cl-1', type: 'coverLetter', title: 'My Cover Letter', currentVersion: 1, status: 'active' },
  ];

  beforeEach(() => {
    JobsApi.getAllDocuments.mockResolvedValue({ documents: libraryDocs });
  });

  it('renders the Linked Documents section', async () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(await screen.findByText('Linked Documents')).toBeInTheDocument();
  });

  it('shows "Not linked" for resume and cover letter by default', async () => {
    render(<JobDetailPanel {...defaultProps} />);
    await waitFor(() => {
      const notLinked = screen.getAllByText(/not linked/i);
      expect(notLinked).toHaveLength(2);
    });
  });

  it('shows the linked resume title when job.linkedDocuments.resume is set', async () => {
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    expect(await screen.findByText('My Resume')).toBeInTheDocument();
  });

  it('clicking Link resume button opens picker with active library resumes', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);
    await screen.findByText('Linked Documents');
    await user.click(screen.getByRole('button', { name: /link resume/i }));
    const picker = await screen.findByRole('list', { name: /resume picker/i });
    expect(within(picker).getByText('My Resume')).toBeInTheDocument();
  });

  it('clicking a document in the picker calls linkDocumentToJob and shows the linked title', async () => {
    const user = userEvent.setup();
    JobsApi.linkDocumentToJob.mockResolvedValue({ job: { _id: 'abc123' } });
    render(<JobDetailPanel {...defaultProps} />);
    await screen.findByText('Linked Documents');
    await user.click(screen.getByRole('button', { name: /link resume/i }));
    const picker = await screen.findByRole('list', { name: /resume picker/i });
    await user.click(within(picker).getByText('My Resume'));
    await waitFor(() => {
      expect(JobsApi.linkDocumentToJob).toHaveBeenCalledWith('faketoken', 'abc123', {
        type: 'resume',
        documentId: 'lib-resume-1',
        confirmReplace: false,
      });
    });
    expect(await screen.findByText('My Resume')).toBeInTheDocument();
  });

  it('shows replacement confirmation when 409 is returned (S3-BR-011)', async () => {
    const user = userEvent.setup();
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    JobsApi.linkDocumentToJob.mockResolvedValueOnce({
      requiresConfirmation: true,
      currentDocumentTitle: 'My Resume',
    });
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    await screen.findByText('Linked Documents');
    await user.click(screen.getByRole('button', { name: /change linked resume/i }));
    const picker = await screen.findByRole('list', { name: /resume picker/i });
    await user.click(within(picker).getByText('My Resume'));
    expect(await screen.findByRole('button', { name: /^replace$/i })).toBeInTheDocument();
  });

  it('calls linkDocumentToJob with confirmReplace=true when Replace is clicked', async () => {
    const user = userEvent.setup();
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    JobsApi.linkDocumentToJob
      .mockResolvedValueOnce({ requiresConfirmation: true, currentDocumentTitle: 'My Resume' })
      .mockResolvedValueOnce({ job: { _id: 'abc123' } });
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    await screen.findByText('Linked Documents');
    await user.click(screen.getByRole('button', { name: /change linked resume/i }));
    const picker = await screen.findByRole('list', { name: /resume picker/i });
    await user.click(within(picker).getByText('My Resume'));
    await user.click(await screen.findByRole('button', { name: /^replace$/i }));
    expect(JobsApi.linkDocumentToJob).toHaveBeenLastCalledWith('faketoken', 'abc123', {
      type: 'resume',
      documentId: 'lib-resume-1',
      confirmReplace: true,
    });
  });

  it('clicking Unlink calls unlinkDocumentFromJob and shows Not linked', async () => {
    const user = userEvent.setup();
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    await screen.findByText('My Resume');
    await user.click(screen.getByRole('button', { name: /unlink resume/i }));
    await waitFor(() => {
      expect(JobsApi.unlinkDocumentFromJob).toHaveBeenCalledWith('faketoken', 'abc123', 'resume');
    });
    expect(screen.getAllByText(/not linked/i).length).toBeGreaterThan(0);
  });
});

describe('JobDetailPanel — Library Visibility (S3-010)', () => {
  const libraryDocs = [
    { _id: 'lib-resume-1', type: 'resume', title: 'My Resume', currentVersion: 3, status: 'active', updatedAt: '2026-06-15T00:00:00.000Z' },
  ];

  beforeEach(() => {
    JobsApi.getAllDocuments.mockResolvedValue({ documents: libraryDocs });
    JobsApi.getDocument.mockResolvedValue({ document: { _id: 'lib-resume-1', type: 'resume', title: 'My Resume', version: 3, text: 'Senior engineer resume body.' } });
  });

  it('shows version badge and date for a linked document (S3-010)', async () => {
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    expect(await screen.findByText(/v3/)).toBeInTheDocument();
    expect(screen.getByText(/jun 15, 2026/i)).toBeInTheDocument();
  });

  it('clicking View fetches the document text and shows it inline', async () => {
    const user = userEvent.setup();
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    await screen.findByText('My Resume');
    await user.click(screen.getByRole('button', { name: /view resume text/i }));
    expect(await screen.findByText('Senior engineer resume body.')).toBeInTheDocument();
    expect(JobsApi.getDocument).toHaveBeenCalledWith('faketoken', 'lib-resume-1');
  });

  it('clicking View again (Hide) collapses the text', async () => {
    const user = userEvent.setup();
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    await screen.findByText('My Resume');
    await user.click(screen.getByRole('button', { name: /view resume text/i }));
    await screen.findByText('Senior engineer resume body.');
    await user.click(screen.getByRole('button', { name: /hide resume text/i }));
    expect(screen.queryByText('Senior engineer resume body.')).not.toBeInTheDocument();
  });

  it('shows an error message when document fetch fails', async () => {
    JobsApi.getDocument.mockRejectedValueOnce(new Error('Document not found'));
    const user = userEvent.setup();
    const jobWithLink = { ...mockJob, linkedDocuments: { resume: 'lib-resume-1' } };
    render(<JobDetailPanel {...defaultProps} job={jobWithLink} />);
    await screen.findByText('My Resume');
    await user.click(screen.getByRole('button', { name: /view resume text/i }));
    expect(await screen.findByText('Document not found')).toBeInTheDocument();
  });
});

describe('JobDetailPanel — Archive and Restore (S2-014)', () => {
  const archivedJob = {
    ...mockJob,
    stage: 'Archived',
    stageHistory: [
      {
        id: 'sh-1',
        fromStage: 'Interview',
        toStage: 'Archived',
        changedAt: '2026-06-20T00:00:00.000Z',
      },
    ],
  };

  it('shows the Archive button when stage is not Archived', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /archive frontend engineer/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /restore frontend engineer/i })
    ).not.toBeInTheDocument();
  });

  it('shows the Restore button (not Archive) when stage is Archived', () => {
    render(<JobDetailPanel {...defaultProps} job={archivedJob} />);
    expect(
      screen.getByRole('button', { name: /restore frontend engineer/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /archive frontend engineer/i })
    ).not.toBeInTheDocument();
  });

  it('opens the archive dialog when Archive is clicked', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);
    await user.click(
      screen.getByRole('button', { name: /archive frontend engineer/i })
    );
    expect(
      screen.getByRole('alertdialog', { name: /archive job/i })
    ).toBeInTheDocument();
  });

  it('opens the restore dialog when Restore is clicked', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} job={archivedJob} />);
    await user.click(
      screen.getByRole('button', { name: /restore frontend engineer/i })
    );
    expect(
      screen.getByRole('alertdialog', { name: /restore job/i })
    ).toBeInTheDocument();
  });

  it('calls onArchive with the note when Archive is confirmed', async () => {
    const onArchive = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} onArchive={onArchive} />);

    await user.click(
      screen.getByRole('button', { name: /archive frontend engineer/i })
    );
    const dialog = screen.getByRole('alertdialog', { name: /archive job/i });

    await user.type(within(dialog).getByLabelText(/note/i), 'Position filled');
    await user.click(
      within(dialog).getByRole('button', { name: /^archive$/i })
    );

    expect(onArchive).toHaveBeenCalledWith('Position filled');
  });

  it('calls onRestore when Restore is confirmed', async () => {
    const onRestore = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <JobDetailPanel
        {...defaultProps}
        job={archivedJob}
        onRestore={onRestore}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /restore frontend engineer/i })
    );
    await user.click(screen.getByRole('button', { name: /^restore$/i }));

    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('shows the correct restore target stage in the restore dialog', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} job={archivedJob} />);

    await user.click(
      screen.getByRole('button', { name: /restore frontend engineer/i })
    );
    const dialog = screen.getByRole('alertdialog', { name: /restore job/i });

    expect(within(dialog).getByText(/interview/i)).toBeInTheDocument();
  });
});
describe('Company Research (S3-011)', () => {
    it('renders Company Research exactly once (regression)', () => {
      render(<JobDetailPanel {...defaultProps} />);
      expect(
        screen.getAllByRole('heading', { name: /company research/i })
      ).toHaveLength(1);
    });

    it('generates and displays company research from user context', async () => {
      JobsApi.generateCompanyResearch.mockResolvedValue({
        research: 'Acme builds developer tools. They value speed and ownership.',
      });
      const user = userEvent.setup();
      render(<JobDetailPanel {...defaultProps} />);

      await user.type(
        screen.getByLabelText(/company research context/i),
        'Focus on their tech stack'
      );
      await user.click(screen.getByRole('button', { name: /research acme corp/i }));

      expect(await screen.findByDisplayValue(/developer tools/i)).toBeInTheDocument();
      expect(JobsApi.generateCompanyResearch).toHaveBeenCalledWith(
        'abc123',
        'faketoken',
        expect.objectContaining({ userContext: 'Focus on their tech stack' })
      );
    });

    it('saves edited research notes', async () => {
      JobsApi.generateCompanyResearch.mockResolvedValue({ research: 'Some research' });
      JobsApi.updateResearchNotes.mockResolvedValue({ job: { ...mockJob, researchNotes: 'Some research' } });
      const user = userEvent.setup();
      render(<JobDetailPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /research acme corp/i }));
      await screen.findByDisplayValue('Some research');
      await user.click(screen.getByRole('button', { name: /save research notes/i }));

      expect(JobsApi.updateResearchNotes).toHaveBeenCalledWith(
        'abc123',
        'faketoken',
        'Some research'
      );
      expect(await screen.findByText(/research notes saved/i)).toBeInTheDocument();
    });

    it('shows an error when research generation fails', async () => {
      JobsApi.generateCompanyResearch.mockRejectedValue(new Error('Could not generate company research'));
      const user = userEvent.setup();
      render(<JobDetailPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /research acme corp/i }));

      expect(await screen.findByText(/could not generate company research/i)).toBeInTheDocument();
    });
  });

describe('Interview Prep Notes (S3-013)', () => {
  it('renders Interview Prep Notes exactly once', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getAllByRole('heading', { name: /interview prep notes/i })
    ).toHaveLength(1);
  });

  it('saves interview prep notes successfully', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);

    const textarea = screen.getByRole('textbox', {
      name: /^interview prep notes$/i,
    });
    await user.type(textarea, 'Review architecture tradeoffs and metrics.');
    await user.click(
      screen.getByRole('button', { name: /save interview prep notes/i })
    );

    expect(JobsApi.updateInterviewPrepNotes).toHaveBeenCalledWith(
      'abc123',
      'faketoken',
      'Review architecture tradeoffs and metrics.'
    );
    expect(
      await screen.findByText(/interview prep notes saved/i)
    ).toBeInTheDocument();
  });
});

