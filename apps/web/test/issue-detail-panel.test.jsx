import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueDetailPanel } from '../src/components/detail/IssueDetailPanel.jsx';

// LEARN: both assertions here pin review findings from PR #49 — a NaN% and a
// silent data loss. Mock the data hooks so the test is about the component's
// behavior, not the network.
const issue = {
  id: 'i1',
  key: 'GJ-1',
  title: 'Test issue',
  description: 'Original',
  priority: 'MEDIUM',
  columnName: 'To Do',
  progress: { done: 0, total: 0 },
  children: [],
  comments: [],
  activityEvents: [],
};

const patchMutate = vi.fn();
vi.mock('../src/lib/hooks.js', () => ({
  useIssueDetail: () => ({ data: issue, isLoading: false }),
  useAddComment: () => ({ mutate: vi.fn(), isPending: false }),
  usePatchIssueField: () => ({ mutate: patchMutate }),
}));

describe('IssueDetailPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows 0% (never NaN%) when there are no sub-tasks', () => {
    render(<IssueDetailPanel projectKey="GJ" number={1} onClose={vi.fn()} />);
    expect(screen.getByText(/0\/0 \(0%\)/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('confirms before closing when the description has unsaved edits', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<IssueDetailPanel projectKey="GJ" number={1} onClose={onClose} />);

    // enter edit mode and change the text (target the description textarea by
    // its current value, since the comment box is also a textbox)
    await user.click(screen.getByText('Original'));
    const textarea = screen.getByDisplayValue('Original');
    await user.clear(textarea);
    await user.type(textarea, 'Unsaved change');

    // user declines the confirm → panel stays open
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).not.toHaveBeenCalled();

    // user accepts the confirm → panel closes
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
