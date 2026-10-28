import { mockDb } from '../store';
import { extOf, projectState } from '../project-store';
import { projectSnapshotSchema, type ProjectSnapshot } from './schema';

const packSets = (map: Map<string, Set<string>>) =>
  [...map].map(([id, values]) => [id, [...values]]);
const unpackSets = (entries: [string, string[]][]) =>
  new Map(entries.map(([id, values]) => [id, new Set(values)]));

export function captureProjectSnapshot(): ProjectSnapshot {
  const projects = mockDb().projects;
  const state = projectState();
  return projectSnapshotSchema.parse({
    projects,
    ext: projects.map((project) => [project.id, extOf(project)]),
    comments: mockDb().comments,
    follows: packSets(state.follows),
    likes: packSets(state.likes),
    repoRequests: packSets(state.repoRequests),
    contactNames: [...state.contactNames],
    idempotency: [...state.idempotency],
    seededComments: [...state.seededComments],
  });
}

export function restoreProjectSnapshot(input: unknown): void {
  const data = projectSnapshotSchema.parse(input);
  // Initialize seed-only side effects before replacing records, never increment restored totals.
  const state = projectState();
  mockDb().projects = data.projects;
  state.ext = new Map(data.ext);
  mockDb().comments = data.comments;
  state.follows = unpackSets(data.follows);
  state.likes = unpackSets(data.likes);
  state.repoRequests = unpackSets(data.repoRequests);
  state.contactNames = new Map(data.contactNames);
  state.idempotency = new Map(data.idempotency);
  state.seededComments = new Set(data.seededComments);
}
