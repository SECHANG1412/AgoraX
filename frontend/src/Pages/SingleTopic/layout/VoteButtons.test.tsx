import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import VoteButtons from './VoteButtons';

const defaultProps = {
  voteOptions: ['찬성', '반대'],
  voteResults: [2, 1],
  totalVotes: 3,
  hasVoted: false,
  useVoteIndex: null,
  onVote: vi.fn(),
  colors: ['#16a34a', '#e11d48'],
  isAuthLoading: false,
  isClosed: false,
};

describe('투표 버튼', () => {
  it('선택지별 득표율과 득표 수를 표시한다', () => {
    render(<VoteButtons {...defaultProps} />);

    expect(screen.getByText('찬성')).toBeInTheDocument();
    expect(screen.getByText('반대')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('2표')).toBeInTheDocument();
    expect(screen.getByText('1표')).toBeInTheDocument();
  });

  it('선택한 투표 버튼의 인덱스를 전달한다', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<VoteButtons {...defaultProps} onVote={onVote} />);

    await user.click(screen.getAllByRole('button', { name: '투표하기' })[1]);

    expect(onVote).toHaveBeenCalledWith(1);
  });

  it('투표한 사용자의 선택을 표시하고 추가 투표 버튼을 숨긴다', () => {
    render(<VoteButtons {...defaultProps} hasVoted useVoteIndex={0} />);

    expect(screen.getByText('내 선택')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '투표하기' })).not.toBeInTheDocument();
  });

  it('마감 상태에서는 투표 버튼을 숨긴다', () => {
    render(<VoteButtons {...defaultProps} isClosed />);

    expect(screen.queryByRole('button', { name: '투표하기' })).not.toBeInTheDocument();
  });

  it('인증 상태 확인 중에는 투표 버튼을 비활성화한다', () => {
    render(<VoteButtons {...defaultProps} isAuthLoading />);

    screen.getAllByRole('button', { name: '투표하기' }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
