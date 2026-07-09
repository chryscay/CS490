import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocumentLibraryPage from '../pages/DocumentLibraryPage';

vi.mock('../features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../features/jobs/jobsApi', () => ({
  getAllDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  renameDocument: vi.fn(),
  duplicateDocument: vi.fn(),
  archiveDocument: vi.fn(),
  restoreDocument: vi.fn(),
}));

import { useAuth } from '../features/auth/useAuth';
import { getAllDocuments, uploadDocument, renameDocument, duplicateDocument, archiveDocument, restoreDocument } from '../features/jobs/jobsApi';

const mockUser = {
  getIdToken: vi.fn().mockResolvedValue('fake-token'),
};

const sampleDocs = [
  {
    _id: 'doc-1',
    jobId: 'job-1',
    type: 'resume',
    title: 'Engineer Resume',
    currentVersion: 2,
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    _id: 'doc-2',
    jobId: 'job-2',
    type: 'coverLetter',
    title: 'Engineer Cover Letter',
    currentVersion: 1,
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ currentUser: mockUser });
  getAllDocuments.mockResolvedValue({ documents: sampleDocs });
  uploadDocument.mockResolvedValue({
    document: {
      _id: 'doc-3',
      type: 'resume',
      title: 'Uploaded Resume',
      currentVersion: 1,
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  });
  archiveDocument.mockResolvedValue({
    document: { ...sampleDocs[0], status: 'archived', updatedAt: '2026-07-09T00:00:00.000Z' },
  });
  restoreDocument.mockResolvedValue({
    document: { ...sampleDocs[1], status: 'active', updatedAt: '2026-07-09T00:00:00.000Z' },
  });
  renameDocument.mockResolvedValue({
    document: {
      _id: 'doc-1',
      jobId: 'job-1',
      type: 'resume',
      title: 'Renamed Resume',
      status: 'active',
      tags: [],
      currentVersion: 1,
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  });
  duplicateDocument.mockResolvedValue({
    document: {
      _id: 'doc-copy',
      jobId: 'synthetic',
      type: 'resume',
      title: 'Copy of Engineer Resume',
      status: 'active',
      tags: [],
      currentVersion: 1,
      updatedAt: '2026-07-02T00:00:00.000Z',
    },
  });
});

describe('DocumentLibraryPage', () => {
  it('renders the Document Library heading', async () => {
    render(<DocumentLibraryPage />);
    expect(screen.getByRole('heading', { name: /document library/i })).toBeInTheDocument();
  });

  it('renders the document list from getAllDocuments', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => {
      expect(screen.getByText('Engineer Resume')).toBeInTheDocument();
      expect(screen.getByText('Engineer Cover Letter')).toBeInTheDocument();
    });
  });

  it('shows empty state when there are no documents', async () => {
    getAllDocuments.mockResolvedValue({ documents: [] });
    render(<DocumentLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText(/no documents yet/i)).toBeInTheDocument()
    );
  });

  it('shows empty state for filter when documents exist but none match', async () => {
    getAllDocuments.mockResolvedValue({
      documents: [sampleDocs[0]],
    });
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /cover letter/i }));
    expect(screen.getByText(/no documents match/i)).toBeInTheDocument();
  });

  it('shows an error state when getAllDocuments fails', async () => {
    getAllDocuments.mockRejectedValue(new Error('network error'));
    render(<DocumentLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText(/could not load documents/i)).toBeInTheDocument()
    );
  });

  it('renders resume and cover letter stat counts', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => {
      expect(screen.getByText('Resumes')).toBeInTheDocument();
      expect(screen.getByText('Cover Letters')).toBeInTheDocument();
    });
  });

  it('filters to only resumes when Resume tab is clicked', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /^resume$/i }));
    expect(screen.getByText('Engineer Resume')).toBeInTheDocument();
    expect(screen.queryByText('Engineer Cover Letter')).not.toBeInTheDocument();
  });

  it('filters by status — shows only archived documents when Archived is selected', async () => {
    getAllDocuments.mockResolvedValue({
      documents: [
        { ...sampleDocs[0], status: 'active' },
        { ...sampleDocs[1], status: 'archived' },
      ],
    });
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /filter by status/i }), 'archived');
    expect(screen.queryByText('Engineer Resume')).not.toBeInTheDocument();
    expect(screen.getByText('Engineer Cover Letter')).toBeInTheDocument();
  });

  it('filters by tag — shows only documents that have the selected tag', async () => {
    getAllDocuments.mockResolvedValue({
      documents: [
        { ...sampleDocs[0], tags: ['senior'] },
        { ...sampleDocs[1], tags: [] },
      ],
    });
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /filter by tag/i }), 'senior');
    expect(screen.getByText('Engineer Resume')).toBeInTheDocument();
    expect(screen.queryByText('Engineer Cover Letter')).not.toBeInTheDocument();
  });

  it('sorts ascending by updated date when Updated ↑ is selected', async () => {
    getAllDocuments.mockResolvedValue({
      documents: [
        { ...sampleDocs[0], updatedAt: '2026-06-01T00:00:00.000Z' },
        { ...sampleDocs[1], updatedAt: '2026-05-01T00:00:00.000Z' },
      ],
    });
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort by date/i }), 'asc');

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Engineer Cover Letter');
    expect(items[1]).toHaveTextContent('Engineer Resume');
  });

  it('active document shows Archive button which calls archiveDocument and updates status badge', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /archive engineer resume/i }));

    await waitFor(() => {
      expect(archiveDocument).toHaveBeenCalledWith('fake-token', 'doc-1');
    });
    expect(screen.getByText('archived')).toBeInTheDocument();
  });

  it('archived document shows Restore button which calls restoreDocument and removes archived badge', async () => {
    getAllDocuments.mockResolvedValue({
      documents: [
        { ...sampleDocs[0], status: 'archived' },
        sampleDocs[1],
      ],
    });
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    expect(screen.getByText('archived')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /restore engineer resume/i }));

    await waitFor(() => {
      expect(restoreDocument).toHaveBeenCalledWith('fake-token', 'doc-1');
      expect(screen.queryByText('archived')).not.toBeInTheDocument();
    });
  });

  it('clicking a document title enters rename mode (shows input with current title)', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /rename engineer resume/i }));

    const input = screen.getByRole('textbox', { name: /rename document/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Engineer Resume');
  });

  it('pressing Escape cancels rename without calling the API', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /rename engineer resume/i }));
    await userEvent.keyboard('{Escape}');

    expect(renameDocument).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /rename engineer resume/i })).toBeInTheDocument();
  });

  it('pressing Enter after editing calls renameDocument and updates the title', async () => {
    const user = userEvent.setup();
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /rename engineer resume/i }));

    const input = screen.getByRole('textbox', { name: /rename document/i });
    await user.clear(input);
    await user.type(input, 'Senior Engineer Resume');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(renameDocument).toHaveBeenCalledWith('fake-token', 'doc-1', 'Senior Engineer Resume');
    });
    expect(screen.getByText('Renamed Resume')).toBeInTheDocument();
  });

  it('clicking Copy calls duplicateDocument and prepends the copy to the list', async () => {
    render(<DocumentLibraryPage />);
    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    const copyButtons = screen.getAllByRole('button', { name: /duplicate/i });
    await userEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(duplicateDocument).toHaveBeenCalledWith('fake-token', 'doc-1');
      expect(screen.getByText('Copy of Engineer Resume')).toBeInTheDocument();
    });
  });

  it('uploads a document successfully and shows success message', async () => {
    getAllDocuments
      .mockResolvedValueOnce({ documents: sampleDocs })
      .mockResolvedValueOnce({
        documents: [
          ...sampleDocs,
          {
            _id: 'doc-3',
            type: 'resume',
            title: 'Uploaded Resume',
            currentVersion: 1,
            updatedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      });

    const user = userEvent.setup();
    render(<DocumentLibraryPage />);

    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    const file = new File(['Resume body'], 'resume.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/file/i);
    const titleInput = screen.getByPlaceholderText('Senior Engineer Resume');
    const jobIdInput = screen.getByPlaceholderText('Link to job if needed');

    await user.type(titleInput, 'My Resume Upload');
    await user.type(jobIdInput, 'job-42');
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /^upload$/i }));

    await waitFor(() =>
      expect(screen.getByText(/document uploaded successfully/i)).toBeInTheDocument()
    );
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(getAllDocuments).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Uploaded Resume')).toBeInTheDocument();
    expect(titleInput).toHaveValue('');
    expect(jobIdInput).toHaveValue('');
    expect(fileInput).toHaveValue('');
  });

  it('shows clear upload error for unsupported format', async () => {
    const user = userEvent.setup();
    render(<DocumentLibraryPage />);

    await waitFor(() => expect(screen.getByText('Engineer Resume')).toBeInTheDocument());

    const file = new File(['PNG bytes'], 'resume.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /^upload$/i }));

    expect(
      screen.getByText(
        'Unsupported file format. Supported formats are PDF, DOCX, and TXT.'
      )
    ).toBeInTheDocument();
    expect(uploadDocument).not.toHaveBeenCalled();
  });
});
