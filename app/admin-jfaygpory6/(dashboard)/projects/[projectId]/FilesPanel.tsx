'use client';

import { FormEvent, useRef, useState } from 'react';
import { Download, Eye, EyeOff, FileText, Trash2 } from 'lucide-react';
import { isGalleryImage, type UploadSettings } from '../../../../lib/portal/constants';
import { fileRequest, uploadErrorText } from '../../../../lib/portal/uploadClient';
import MediaLightbox from '../../../../components/MediaLightbox';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';
import { confirmDialog } from '../../../../components/confirmDialog';

export type AdminFile = {
  id: string;
  filename: string;
  size: string;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  visibleToClient: boolean;
};

type Props = UploadSettings & {
  projectId: string;
  files: AdminFile[];
};

/** Images as a gallery (click for full size), other files as a list; share/hide and delete on each. */
export default function FilesPanel({ projectId, files, maxBytes, maxSizeLabel, accept, direct }: Props) {
  const { run, pending, error, setError } = useAdminAction();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [visibleToClient, setVisibleToClient] = useState(true);
  // Direct uploads to Vercel Blob run before the app request itself.
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const base = `/api/admin/projects/${projectId}/files`;
  const busy = pending !== null || uploading;
  const images = files.filter((item) => isGalleryImage(item.mimeType));
  const documents = files.filter((item) => !isGalleryImage(item.mimeType));

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || busy) return;
    if (file.size > maxBytes) {
      setError(`That file is larger than ${maxSizeLabel}.`);
      return;
    }
    setError('');
    setUploading(direct);
    const prepared = await fileRequest(file, { visibleToClient: String(visibleToClient) }, {
      direct,
      tokenUrl: `/api/admin/projects/${projectId}/uploads`,
      projectId,
    });
    setUploading(false);
    if (!prepared.ok) {
      setError(uploadErrorText(prepared.code));
      return;
    }
    const result = await run('upload', base, prepared.init);
    if (result) {
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus(); // Upload is disabled again; keep keyboard focus nearby
      }
    }
  };

  const toggleVisibility = (target: AdminFile) =>
    run(`visibility-${target.id}`, `${base}/${target.id}`, jsonInit('PATCH', { visibleToClient: !target.visibleToClient }));

  const remove = async (target: AdminFile) => {
    if (!(await confirmDialog({ title: 'Delete file?', message: `“${target.filename}” will be deleted. This cannot be undone.`, confirmLabel: 'Delete', danger: true }))) return;
    await run(`delete-${target.id}`, `${base}/${target.id}`, jsonInit('DELETE'));
  };

  const controls = (item: AdminFile) => (
    <>
      <a href={`${base}/${item.id}`} className={projectStyles.iconButton} aria-label={`Download ${item.filename}`} download>
        <Download size={15} aria-hidden="true" />
      </a>
      <button
        type="button"
        className={projectStyles.iconButton}
        onClick={() => toggleVisibility(item)}
        aria-disabled={busy}
        aria-label={item.visibleToClient ? `Hide ${item.filename} from the client` : `Share ${item.filename} with the client`}
        title={item.visibleToClient ? 'Shared with client — click to hide' : 'Internal — click to share'}
      >
        {item.visibleToClient ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
        onClick={() => remove(item)}
        aria-disabled={busy}
        aria-label={`Delete ${item.filename}`}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </>
  );

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
      {files.length === 0 && <p className={projectStyles.muted}>No files yet.</p>}

      {images.length > 0 && (
        <>
          <h3 className={projectStyles.groupTitle}>Images</h3>
          <ul className={projectStyles.gallery}>
            {images.map((item, index) => (
              <li key={item.id} className={projectStyles.galleryItem}>
                <button
                  type="button"
                  className={projectStyles.galleryThumb}
                  onClick={() => setOpen(index)}
                  aria-label={`Open ${item.filename}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- private files stream through an authorized route */}
                  <img src={`${base}/${item.id}`} alt="" loading="lazy" decoding="async" />
                  {!item.visibleToClient && <span className={projectStyles.galleryTag}>Internal</span>}
                </button>
                <span className={projectStyles.galleryName} title={item.filename}>
                  <bdi>{item.filename}</bdi>
                </span>
                <span className={projectStyles.muted}>
                  {item.size} · {item.uploadedBy}
                </span>
                <div className={projectStyles.galleryControls}>{controls(item)}</div>
              </li>
            ))}
          </ul>
          <MediaLightbox
            items={images.map((item) => ({
              id: item.id,
              src: `${base}/${item.id}`,
              title: item.filename,
              meta: `${item.size} · ${item.uploadedBy} · ${item.uploadedAt}${item.visibleToClient ? '' : ' · Internal'}`,
            }))}
            index={open !== null && open < images.length ? open : null}
            onIndex={setOpen}
            onClose={() => setOpen(null)}
            labels={{
              close: 'Close',
              previous: 'Previous image',
              next: 'Next image',
              download: 'Download',
              position: (n, total) => `${n} of ${total}`,
            }}
          />
        </>
      )}

      {documents.length > 0 && (
        <>
          {images.length > 0 && <h3 className={projectStyles.groupTitle}>Documents</h3>}
          <ul className={projectStyles.list}>
            {documents.map((item) => (
              <li key={item.id} className={projectStyles.item}>
                <FileText size={20} aria-hidden="true" className={projectStyles.fileIcon} />
                <div className={projectStyles.itemMain}>
                  <span className={projectStyles.itemTitle} dir="auto">
                    {item.filename}{' '}
                    {!item.visibleToClient && <span className={projectStyles.internalTag}>Internal</span>}
                  </span>
                  <span className={projectStyles.muted}>
                    {item.size} · {item.uploadedBy} · {item.uploadedAt}
                  </span>
                </div>
                <div className={projectStyles.itemControls}>{controls(item)}</div>
              </li>
            ))}
          </ul>
        </>
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
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={!file && !busy}
            aria-disabled={busy}
          >
            {uploading || pending === 'upload' ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </section>
  );
}
