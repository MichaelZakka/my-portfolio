import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, FolderGit2, Share2, Sparkles, Type, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import { requireAdminSession } from '../../../lib/session';
import { readStoredContent, resolveDocs, type StoredContent } from '../../../lib/content/store';
import { PROFILE_TEXT_KEYS, type ContentPart } from '../../../lib/content/schema';
import { TEXT_SECTIONS, sectionKeys } from '../../../lib/content/text';
import { StorageNotice } from './_editor/StorageNotice';
import c from './content.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Content' };

function editedOn(date: Date | undefined) {
  return date ? `Edited ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : null;
}

export default async function ContentOverviewPage() {
  await requireAdminSession();
  const stored = await readStoredContent();
  const docs = resolveDocs(stored);

  const textKeys = TEXT_SECTIONS.flatMap(sectionKeys);
  const editedTexts = textKeys.filter((key) => key in stored.text.en || key in stored.text.ar).length;
  const profileTextEdited = Object.values(PROFILE_TEXT_KEYS).some((k) => k in stored.text.en || k in stored.text.ar);
  const published = docs.projects.filter((p) => p.published).length;
  const skillCount = docs.skills.groups.reduce((sum, g) => sum + g.skills.length, 0);

  const status = (part: ContentPart, extraEdited = false) => {
    if (stored.invalid.includes(part)) return { label: 'Saved version unreadable', tone: c.statusWarn };
    const edited = editedOn(stored.updatedAt[part]) ?? (extraEdited ? editedOn(stored.updatedAt.text) : null);
    return edited ? { label: edited, tone: c.statusEdited } : { label: 'Original content', tone: '' };
  };

  const cards: { href: string; icon: LucideIcon; title: string; text: string; stat: string; status: { label: string; tone: string } }[] = [
    {
      href: '/admin-jfaygpory6/content/profile',
      icon: UserRound,
      title: 'Profile & contact',
      text: 'Name, job title, email, phone, WhatsApp, location and your CV.',
      stat: docs.profile.email || 'No email set',
      status: status('profile', profileTextEdited),
    },
    {
      href: '/admin-jfaygpory6/content/social',
      icon: Share2,
      title: 'Social links',
      text: 'LinkedIn, GitHub and any other profile, and where each one shows.',
      stat: `${docs.socials.length} link${docs.socials.length === 1 ? '' : 's'}`,
      status: status('socials'),
    },
    {
      href: '/admin-jfaygpory6/content/projects',
      icon: FolderGit2,
      title: 'Portfolio projects',
      text: 'The project cards and their case-study pages.',
      stat: `${published} published · ${docs.projects.length - published} draft${docs.projects.length - published === 1 ? '' : 's'}`,
      status: status('projects'),
    },
    {
      href: '/admin-jfaygpory6/content/experience',
      icon: Briefcase,
      title: 'Experience',
      text: 'Roles, companies, dates and achievements.',
      stat: `${docs.experience.length} role${docs.experience.length === 1 ? '' : 's'}`,
      status: status('experience'),
    },
    {
      href: '/admin-jfaygpory6/content/strengths',
      icon: Sparkles,
      title: 'Strengths',
      text: 'The “What I bring to a team” cards.',
      stat: `${docs.strengths.length} card${docs.strengths.length === 1 ? '' : 's'}`,
      status: status('strengths'),
    },
    {
      href: '/admin-jfaygpory6/content/skills',
      icon: Wrench,
      title: 'Skills',
      text: 'Skill groups and the stack in the hero terminal.',
      stat: `${docs.skills.groups.length} groups · ${skillCount} skills`,
      status: status('skills'),
    },
    {
      href: '/admin-jfaygpory6/content/text',
      icon: Type,
      title: 'Section text',
      text: 'Headings, paragraphs, buttons and labels of every section.',
      stat: `${TEXT_SECTIONS.length} sections · ${textKeys.length} texts`,
      status: editedTexts
        ? { label: `${editedTexts} text${editedTexts === 1 ? '' : 's'} edited`, tone: c.statusEdited }
        : { label: 'Original content', tone: '' },
    },
  ];

  return (
    <>
      <StorageNotice stored={stored as StoredContent} />
      <div className={c.overviewGrid}>
        {cards.map(({ href, icon: Icon, title, text, stat, status: s }) => (
          <Link key={href} href={href} className={c.overviewCard}>
            <span className={c.overviewIcon} aria-hidden="true">
              <Icon size={20} />
            </span>
            <h2 className={c.overviewTitle}>{title}</h2>
            <p className={c.overviewText}>{text}</p>
            <span className={`${c.status} ${s.tone}`}>{s.label}</span>
            <span className={c.overviewStat}>{stat}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
