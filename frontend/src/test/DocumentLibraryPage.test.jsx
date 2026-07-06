import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocumentLibraryPage from '../pages/DocumentLibraryPage';

vi.mock('../features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../features/jobs/jobsApi', () => ({
  getAllDocuments: vi.fn(),
}));

import { useAuth } from '../features/auth/useAuth';
import { getAllDocuments } from '../features/jobs/jobsApi';

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
  useAuth.mockReturnValue({ currentUser: mockUser });
  getAllDocuments.mockResolvedValue({ documents: sampleDocs });
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
});
