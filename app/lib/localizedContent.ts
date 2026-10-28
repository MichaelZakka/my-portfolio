import type { Project } from '../../data/projects';
import type { Role } from '../../data/experience';
import type { Strength } from '../../data/strengths';

/**
 * English content lives in the typed data/*.ts files. Other locales can override any text
 * field under the "content" key of their messages file (see messages/ar.json); anything
 * missing falls back to English.
 */
type ProjectOverlay = Partial<
  Pick<Project, 'title' | 'summary' | 'overview' | 'role' | 'team' | 'challenges' | 'solutions' | 'results'>
>;
type RoleOverlay = Partial<Pick<Role, 'company' | 'companyNote' | 'role' | 'duration' | 'location'>> & {
  achievements?: string[];
};
type Content = {
  strengths?: Record<string, Partial<Pick<Strength, 'title' | 'proof'>>>;
  projects?: Record<string, ProjectOverlay>;
  experience?: Record<string, RoleOverlay>;
  skills?: { groups?: Record<string, string>; names?: Record<string, string> };
};

export function contentFrom(messages: unknown): Content {
  return ((messages as { content?: Content } | null)?.content ?? {}) as Content;
}

export function localizeProject(project: Project, content: Content): Project {
  return { ...project, ...(content.projects?.[project.slug] ?? {}) };
}

export function localizeStrength(strength: Strength, content: Content): Strength {
  return { ...strength, ...(content.strengths?.[strength.id] ?? {}) };
}

export function localizeRole(role: Role, content: Content): Role {
  const { achievements, ...rest } = content.experience?.[role.id] ?? {};
  return {
    ...role,
    ...rest,
    achievements: role.achievements.map((a, i) => ({ ...a, text: achievements?.[i] ?? a.text })),
  };
}

export function localizeSkillGroup(id: string, title: string, content: Content): string {
  return content.skills?.groups?.[id] ?? title;
}

export function localizeSkill(name: string, content: Content): string {
  return content.skills?.names?.[name] ?? name;
}
