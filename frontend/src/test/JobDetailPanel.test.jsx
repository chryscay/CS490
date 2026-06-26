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
}));

import * as JobsApi from '../features/jobs/jobsApi.js';
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
};

describe('JobDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('faketoken');
    JobsApi.generateJobDraft.mockResolvedValue({ draft: 'AI resume draft text' });
  });
  it('renders the job title', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /frontend engineer/i })).toBeInTheDocument();
  });

  // Outcome surfacing (S2-013)
  const outcomeJob = {
    ...mockJob,
    stage: 'Offer',
    stageHistory: [
      { toStage: 'Applied', note: '', changedAt: '2026-06-05T00:00:00.000Z' },
      { toStage: 'Offer', note: 'Signed offer letter', changedAt: '2026-06-12T00:00:00.000Z' },
    ],
  };

  it('renders the Outcome section with the note for a job in an outcome stage', () => {
    render(<JobDetailPanel {...defaultProps} job={outcomeJob} />);
    const section = screen.getByText('Outcome').closest('div');
    expect(within(section).getByText('Signed offer letter')).toBeInTheDocument();
  });

  it('shows an empty outcome message when no note was recorded', () => {
    const noNote = {
      ...mockJob,
      stage: 'Rejected',
      stageHistory: [{ toStage: 'Rejected', note: '', changedAt: '2026-06-12T00:00:00.000Z' }],
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
    expect(screen.getByText(/looking for a frontend engineer/i)).toBeInTheDocument();
  });

  it('renders the timeline section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByRole('list', { name: /job activity timeline/i })).toBeInTheDocument();
  });

  it('renders a Job added timeline event', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Job added')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<JobDetailPanel {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close job details/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onEdit when the Edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<JobDetailPanel {...defaultProps} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: /edit frontend engineer/i }));
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
    const stages = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived'];
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
    expect(within(overviewSection).getByText('Frontend Engineer')).toBeInTheDocument();
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
    expect(within(overviewSection).getByText('Follow up next week')).toBeInTheDocument();
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

  it('shows editable draft textarea after generating a resume draft', async () => {
    render(<JobDetailPanel {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /generate resume draft/i }));

    expect(JobsApi.generateJobDraft).toHaveBeenCalledWith('abc123', 'faketoken', { type: 'resume' });
    expect(await screen.findByLabelText(/editable resume draft/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/editable resume draft/i)).toHaveValue('AI resume draft text');
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
    await userEvent.click(screen.getByRole('button', { name: /^delete job$/i }));
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
    expect(screen.queryByRole('button', { name: /add interview/i })).not.toBeInTheDocument();
  });

  it('renders the Interviews section when stage is Interview', () => {
    render(<JobDetailPanel {...defaultProps} job={{ ...mockJob, stage: 'Interview' }} />);
    expect(screen.getByText('Interviews')).toBeInTheDocument();
  });

  it('renders the Add Interview button when stage is Interview', () => {
    render(<JobDetailPanel {...defaultProps} job={{ ...mockJob, stage: 'Interview' }} />);
    expect(screen.getByRole('button', { name: /add interview/i })).toBeInTheDocument();
  });

  it('shows the empty interviews message when there are no entries', () => {
    render(<JobDetailPanel {...defaultProps} job={{ ...mockJob, stage: 'Interview' }} />);
    expect(screen.getByText(/no interviews recorded yet/i)).toBeInTheDocument();
  });

  it('renders existing interview entries', () => {
    render(<JobDetailPanel {...defaultProps} job={interviewJob} />);
    expect(screen.getByRole('list', { name: /interview list/i })).toBeInTheDocument();
    expect(screen.getByText('Technical Screen')).toBeInTheDocument();
    expect(screen.getByText('System Design')).toBeInTheDocument();
    expect(screen.getByText('Algorithms and data structures.')).toBeInTheDocument();
  });

  it('opens the Add Interview form when the Add button is clicked', async () => {
    render(<JobDetailPanel {...defaultProps} job={{ ...mockJob, stage: 'Interview' }} />);
    await userEvent.click(screen.getByRole('button', { name: /add interview/i }));
    expect(screen.getByRole('dialog', { name: /add interview/i })).toBeInTheDocument();
  });

  it('opens the Edit Interview form when an interview Edit button is clicked', async () => {
    render(<JobDetailPanel {...defaultProps} job={interviewJob} />);
    await userEvent.click(screen.getByRole('button', { name: /edit technical screen interview/i }));
    expect(screen.getByRole('dialog', { name: /edit interview/i })).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /edit technical screen interview/i }));
    const formDialog = screen.getByRole('dialog', { name: /edit interview/i });
    await user.clear(within(formDialog).getByRole('textbox', { name: /notes/i }));
    await user.type(within(formDialog).getByRole('textbox', { name: /notes/i }), 'Updated notes.');
    await user.click(within(formDialog).getByRole('button', { name: /save changes/i }));

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
    await user.selectOptions(within(formDialog).getByRole('combobox', { name: /round type/i }), 'Behavioral');
    await user.type(within(formDialog).getByLabelText(/date.*time/i), '2026-08-10T09:00');
    await user.type(within(formDialog).getByRole('textbox', { name: /notes/i }), 'Star method questions.');
    await user.click(within(formDialog).getByRole('button', { name: /add interview/i }));

    expect(onAddInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        roundType: 'Behavioral',
        scheduledAt: expect.any(String),
        notes: 'Star method questions.',
      })
    );
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
    expect(screen.getByRole('button', { name: /add follow-up/i })).toBeInTheDocument();
  });

  it('renders the Add Follow-up button', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add follow-up/i })).toBeInTheDocument();
  });

  it('shows empty message when there are no follow-ups', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText(/no follow-ups yet/i)).toBeInTheDocument();
  });

  it('renders existing follow-up entries', () => {
    render(<JobDetailPanel {...defaultProps} job={followUpJob} />);
    expect(screen.getByRole('list', { name: /follow-up list/i })).toBeInTheDocument();
    expect(screen.getByText('Send thank you email')).toBeInTheDocument();
    expect(screen.getByText('Check portal status')).toBeInTheDocument();
  });

  it('opens the Add Follow-up form when Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /add follow-up/i }));
    expect(screen.getByRole('dialog', { name: /add follow-up/i })).toBeInTheDocument();
  });

  it('opens the Edit Follow-up form when an edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} job={followUpJob} />);
    await user.click(screen.getByRole('button', { name: /edit follow-up "send thank you email"/i }));
    expect(screen.getByRole('dialog', { name: /edit follow-up/i })).toBeInTheDocument();
  });

  it('calls onAddFollowUp when the form is submitted', async () => {
    const onAddFollowUp = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<JobDetailPanel {...defaultProps} onAddFollowUp={onAddFollowUp} />);

    await user.click(screen.getByRole('button', { name: /add follow-up/i }));
    const dialog = screen.getByRole('dialog', { name: /add follow-up/i });

    await user.type(within(dialog).getByLabelText(/title/i), 'Follow up on application');
    await user.type(within(dialog).getByLabelText(/due date/i), '2026-08-05T10:00');
    await user.click(within(dialog).getByRole('button', { name: /add follow-up/i }));

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
    render(<JobDetailPanel {...defaultProps} job={followUpJob} onUpdateFollowUp={onUpdateFollowUp} />);

    await user.click(screen.getByRole('button', { name: /edit follow-up "send thank you email"/i }));
    const dialog = screen.getByRole('dialog', { name: /edit follow-up/i });

    await user.clear(within(dialog).getByLabelText(/title/i));
    await user.type(within(dialog).getByLabelText(/title/i), 'Updated title');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

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
        { id: 'sh-1', toStage: 'Applied', changedAt: '2026-06-05T00:00:00.000Z' },
        { id: 'sh-2', toStage: 'Interview', changedAt: '2026-06-15T00:00:00.000Z' },
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
    expect(screen.getByText(/follow-up added: send thank you email/i)).toBeInTheDocument();
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
    expect(screen.getByText(/follow-up completed: send thank you email/i)).toBeInTheDocument();
  });
});
