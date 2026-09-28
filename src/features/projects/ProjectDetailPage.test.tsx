import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../theme/createAppTheme';
import type { FocusGoal, FocusProject } from '../../types/models';
import { ProjectDetailPage } from './ProjectDetailPage';

const mutations = vi.hoisted(() => ({
  saveProject: { mutateAsync: vi.fn(), isPending: false },
  deleteProject: { mutateAsync: vi.fn(), isPending: false },
  saveGoal: { mutateAsync: vi.fn(), isPending: false },
  deleteGoal: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../data/useFocusData', () => ({ useOrganisationMutations: () => mutations }));
vi.mock('../../app/AppProviders', () => ({ useNotice: () => ({ notify: vi.fn() }) }));

const project: FocusProject = {
  id: 'project-1', name: 'Kensington Impact', colour: '#63a52b', status: 'active',
  created_at: '2026-09-01T09:00:00Z', updated_at: '2026-09-01T09:00:00Z',
};

const goal: FocusGoal = {
  id: 'goal-1', project_id: project.id, title: 'Improve players', why_this_matters: null,
  status: 'active', sort_order: 0, created_at: '2026-09-01T09:00:00Z', updated_at: '2026-09-01T09:00:00Z',
};

describe('ProjectDetailPage goal editing', () => {
  it('opens the inline editor when the mobile-sized edit control is tapped', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <MemoryRouter initialEntries={[`/projects/${project.id}`]}>
          <Routes>
            <Route path="/projects/:projectId" element={<ProjectDetailPage projects={[project]} goals={[goal]} tasks={[]} onAddTask={vi.fn()} onEdit={vi.fn()} onToggle={vi.fn()} onHide={vi.fn()} onFocus={vi.fn()} />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Improve players' }));

    expect(screen.getByRole('textbox', { name: 'Goal' })).toHaveValue('Improve players');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
