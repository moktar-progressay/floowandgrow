import type { FocusProject, FocusTag } from '../../types/models';

export function currentLocalTime(now = new Date()) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export type QuickToken = { type: 'project' | 'tag'; query: string; start: number };

export function activeQuickToken(value: string): QuickToken | null {
  const match = value.match(/(?:^|\s)([@#])([^@#\s]*)$/);
  if (!match || match.index === undefined) return null;
  return {
    type: match[1] === '@' ? 'project' : 'tag',
    query: match[2] ?? '',
    start: match.index + (match[0].startsWith(' ') ? 1 : 0),
  };
}

export function removeQuickToken(value: string, token: QuickToken) {
  return `${value.slice(0, token.start)}${value.slice(token.start + token.query.length + 1)}`.replace(/\s{2,}/g, ' ').trimStart();
}

export function matchingProjects(projects: FocusProject[], query: string) {
  const normalised = query.toLocaleLowerCase();
  return projects.filter((project) => project.name.toLocaleLowerCase().includes(normalised)).slice(0, 5);
}

export function matchingTags(tags: FocusTag[], query: string) {
  const normalised = query.toLocaleLowerCase();
  return tags.filter((tag) => tag.name.toLocaleLowerCase().includes(normalised)).slice(0, 5);
}
