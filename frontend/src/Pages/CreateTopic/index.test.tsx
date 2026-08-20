import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopic } from '../../hooks/useTopic';
import CreateTopic from './index';

vi.mock('../../hooks/useTopic', () => ({ useTopic: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn() };
});

const addTopic = vi.fn();
const navigate = vi.fn();
const mockedUseTopic = vi.mocked(useTopic);
const mockedUseNavigate = vi.mocked(useNavigate);

const renderCreateTopic = () =>
  render(
    <MemoryRouter>
      <CreateTopic />
    </MemoryRouter>
  );

const fillRequiredFields = () => {
  fireEvent.change(document.querySelector('input[name="title"]')!, {
    target: { value: '테스트 토픽' },
  });
  fireEvent.change(document.querySelector('input[name="description"]')!, {
    target: { value: '테스트 설명' },
  });

  const optionInputs = screen.getAllByRole('textbox').filter((input) => !input.hasAttribute('name'));
  fireEvent.change(optionInputs[0], { target: { value: '첫 번째 선택지' } });
  fireEvent.change(optionInputs[1], { target: { value: '두 번째 선택지' } });

  const categorySelect = document.querySelector('select[name="category"]') as HTMLSelectElement;
  fireEvent.change(categorySelect, { target: { value: categorySelect.options[1].value } });
};

beforeEach(() => {
  mockedUseNavigate.mockReturnValue(navigate);
  mockedUseTopic.mockReturnValue({
    loading: false,
    fetchTopics: vi.fn(),
    countAllTopics: vi.fn(),
    addTopic,
    getTopicById: vi.fn(),
    deleteTopic: vi.fn(),
    pinTopic: vi.fn(),
    unpinTopic: vi.fn(),
  });
});

describe('토픽 생성 제출', () => {
  it('생성 요청 중 연속 제출을 한 번만 처리하고 버튼 상태를 복원한다', async () => {
    let resolveRequest: (value: null) => void = () => undefined;
    addTopic.mockImplementation(
      () => new Promise<null>((resolve) => {
        resolveRequest = resolve;
      })
    );

    renderCreateTopic();
    fillRequiredFields();

    const submitButton = screen.getByRole('button', { name: '토픽 만들기' });
    const form = submitButton.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(addTopic).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '토픽 생성 중...' })).toBeDisabled();

    resolveRequest(null);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '토픽 만들기' })).toBeEnabled()
    );
  });

  it('생성 성공 시 생성된 토픽 상세 화면으로 이동한다', async () => {
    addTopic.mockResolvedValue({ topic_id: 42 });

    renderCreateTopic();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: '토픽 만들기' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/topic/42'));
  });
});
