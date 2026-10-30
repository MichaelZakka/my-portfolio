'use client';

import { FormEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import styles from '../../../portal.module.css';

type Props = {
  projectId: string;
  maxBytes: number;
  /** maxBytes formatted for the current locale on the server. */
  maxSizeLabel: string;
  accept: string;
  onUploaded: () => Promise<void>;
};

/** Size and type are checked here for instant feedback; the server enforces both again. */
export default function FileUploadForm({ projectId, maxBytes, maxSizeLabel, accept, onUploaded }: Props) {
  const t = useTranslations('portal.project');
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (uploading) return;
    setError('');
    setNotice('');
    if (!file) {
      setError(errorMessage({ code: 'noFile' }));
      return;
    }
    if (file.size > maxBytes) {
      setError(errorMessage({ code: 'fileTooLarge' }, { size: maxSizeLabel }));
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`/api/portal/projects/${projectId}/files`, { method: 'POST', body });
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response), { size: maxSizeLabel }));
        return;
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await onUploaded();
      setNotice(t('uploaded'));
      // The cleared form disables Upload; return focus to the file picker.
      inputRef.current?.focus();
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className={`${styles.form} ${styles.uploadForm}`} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="portal-upload">
          {t('uploadLabel')}
        </label>
        <input
          ref={inputRef}
          id="portal-upload"
          type="file"
          accept={accept}
          className={styles.fileInput}
          aria-describedby="portal-upload-hint"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError('');
            setNotice('');
          }}
        />
        <span id="portal-upload-hint" className={styles.hint}>
          {t('uploadHint', { size: maxSizeLabel })}
        </span>
      </div>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <div className={styles.composerActions}>
        <span className={styles.hint} role="status">
          {notice}
        </span>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!file && !uploading}
          aria-disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? t('uploading') : t('uploadButton')}
        </button>
      </div>
    </form>
  );
}
