'use client';

import { FormEvent, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Trash2 } from 'lucide-react';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export type AdminFile = {
  id: string;
  filename: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  visibleToClient: boolean;
};

type Props = {
  projectId: string;
  files: AdminFile[];
  maxBytes: number;
  maxSizeLabel: string;
  accept: string;
};

export default function FilesPanel({ projectId, files, maxBytes, maxSizeLabel, accept }: Props) {
  const { run, pending, error, setError } = useAdminAction();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [visibleToClient, setVisibleToClient] = useState(true);
  const base = `/api/admin/projects/${projectId}/files`;

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`That file is larger than ${maxSizeLabel}.`);
      return;
    }
    const body = new FormData();
    body.append('file', file);
    body.append('visibleToClient', String(visibleToClient));
    const result = await run('upload', base, { method: 'POST', body });
    if (result) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const toggleVisibility = (target: AdminFile) =>
    run(`visibility-${target.id}`, `${base}/${target.id}`, jsonInit('PATCH', { visibleToClient: !target.visibleToClient }));

  const remove = async (target: AdminFile) => {
    if (!window.confirm(`Delete “${target.filename}”? This cannot be undone.`)) return;
    await run(`delete-${target.id}`, `${base}/${target.id}`, jsonInit('DELETE'));
  };

  return (
    <section className={styles.card} aria-labelledby="files-title">
      <div className={styles.cardHeader}>
        <h2 id="files-title" className={styles.cardTitle}>
          Files
        </h2>
        <span className={styles.cardMeta}>Downloads go through an authorized route, never a public URL</span>
      </div>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      {files.length === 0 ? (
        <p className={projectStyles.muted}>No files yet.</p>
      ) : (
        <ul className={projectStyles.list}>
          {files.map((item) => (
            <li key={item.id} className={projectStyles.item}>
              <div className={projectStyles.itemMain}>
                <span className={projectStyles.itemTitle} dir="auto">
                  {item.filename}{' '}
                  {!item.visibleToClient && <span className={projectStyles.internalTag}>Internal</span>}
                </span>
                <span className={projectStyles.muted}>
                  {item.size} · {item.uploadedBy} · {item.uploadedAt}
                </span>
              </div>
              <div className={projectStyles.itemControls}>
                <a
                  href={`${base}/${item.id}`}
                  className={projectStyles.iconButton}
                  aria-label={`Download ${item.filename}`}
                  download
                >
                  <Download size={15} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className={projectStyles.iconButton}
                  onClick={() => toggleVisibility(item)}
                  disabled={pending !== null}
                  aria-label={item.visibleToClient ? `Hide ${item.filename} from the client` : `Share ${item.filename} with the client`}
                  title={item.visibleToClient ? 'Shared with client — click to hide' : 'Internal — click to share'}
                >
                  {item.visibleToClient ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
                  onClick={() => remove(item)}
                  disabled={pending !== null}
                  aria-label={`Delete ${item.filename}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className={`${projectStyles.addForm} ${projectStyles.stackForm}`} onSubmit={handleUpload}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="admin-upload">
            Upload a file (max {maxSizeLabel})
          </label>
          <input
            ref={inputRef}
            id="admin-upload"
            type="file"
            accept={accept}
            className={projectStyles.small}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError('');
            }}
          />
        </div>
        <label className={projectStyles.checkboxLabel}>
          <input type="checkbox" checked={visibleToClient} onChange={(e) => setVisibleToClient(e.target.checked)} />
          Visible to client
        </label>
        <div className={projectStyles.formActions}>
          <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={!file || pending !== null}>
            {pending === 'upload' ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </section>
  );
}
