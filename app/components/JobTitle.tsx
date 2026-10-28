import { Fragment } from 'react';

/**
 * Renders the job title with the "(React / Next.js)" part isolated and unbreakable, so in
 * Arabic the Latin run keeps its order and parentheses instead of splitting across lines.
 */
export default function JobTitle({ title }: { title: string }) {
  const match = title.match(/\(([^)]*)\)/);
  if (!match || match.index === undefined) return <>{title}</>;
  const before = title.slice(0, match.index);
  const after = title.slice(match.index + match[0].length);
  return (
    <Fragment>
      {before}
      <bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>
        {match[0]}
      </bdi>
      {after}
    </Fragment>
  );
}
