import { useEffect, useRef, useState } from 'react';
import { FileImage, ImagePlus, Trash2, TriangleAlert } from 'lucide-react';
import type { Submission } from '../../../api/grading';
import { Button } from '../../../components/Button';

export const MAX_PAGES = 20;
export const MAX_PAGE_BYTES = 8 * 1024 * 1024;

export function validateFiles(files: File[], existing: number) {
  const problems: string[] = [];
  if (existing + files.length > MAX_PAGES)
    problems.push(`最多 ${MAX_PAGES} 张，当前已有 ${existing} 张，还能再加 ${Math.max(0, MAX_PAGES - existing)} 张。`);
  for (const file of files) {
    if (!/^image\/(png|jpeg)$/.test(file.type)) problems.push(`${file.name} 不是 JPG/PNG 图片。`);
    else if (file.size > MAX_PAGE_BYTES) problems.push(`${file.name} 超过 8MB。`);
  }
  return problems;
}

export function SubmissionUploader({
  submission,
  submissions,
  canWrite,
  busy,
  onPick,
  onCreate,
  onUpload,
  onReorder,
  onRemove,
}: {
  submission?: Submission;
  submissions: Submission[];
  canWrite: boolean;
  busy: boolean;
  onPick: (id: string) => void;
  onCreate: () => void;
  onUpload: (file: File) => Promise<void>;
  onReorder: (fileIds: string[]) => Promise<void>;
  onRemove: (fileId: string) => Promise<void>;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(0);
  const previewRef = useRef<Record<string, string>>({});

  useEffect(
    () => () => {
      Object.values(previewRef.current).forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const pages = submission?.pages ?? [];

  async function addFiles(files: File[]) {
    setProblems([]);
    setError('');
    const found = validateFiles(files, pages.length);
    if (found.length) {
      setProblems(found);
      return;
    }
    for (const file of files) {
      const url = URL.createObjectURL(file);
      previewRef.current[file.name] = url;
      setPreviews((prev) => ({ ...prev, [file.name]: url }));
      setUploading((n) => n + 1);
      try {
        await onUpload(file);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : `上传 ${file.name} 失败`);
        break;
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function move(index: number, delta: number) {
    if (!submission) return;
    const ids = pages.map((page) => page.fileId);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setError('');
    try {
      await onReorder(ids);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '调整顺序失败');
    }
  }

  async function remove(fileId: string) {
    setError('');
    try {
      await onRemove(fileId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败');
    }
  }

  return (
    <section className="wb-card" aria-labelledby="wb-submission-title">
      <header className="wb-card-head">
        <div>
          <h2 id="wb-submission-title">我的答卷</h2>
          <p className="secondary">
            上传本次作答的答题纸照片，最多 {MAX_PAGES} 张、每张 8MB。批改前可以随时调整页序。
          </p>
        </div>
        <span className="wb-count">
          {pages.length} / {MAX_PAGES} 张
        </span>
      </header>

      {!canWrite && (
        <p className="wb-locked">
          当前周期的成绩写入尚未解锁，暂时不能上传答卷。通过模拟卷或临考跳过后开放。
        </p>
      )}

      {canWrite && (
        <div className="wb-submission-bar">
          <Button disabled={busy} onClick={onCreate}>
            新建一份答卷
          </Button>
          <label className="wb-select">
            已有答卷
            <select
              aria-label="已有答卷"
              value={submission?.id ?? ''}
              onChange={(event) => onPick(event.target.value)}
            >
              <option value="">请选择</option>
              {submissions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id.slice(0, 8)} · {item.pages.length} 张 · 版本 {item.revision}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {canWrite && submission && (
        <>
          <label className={`wb-dropzone${busy || uploading ? ' is-busy' : ''}`}>
            <ImagePlus size={22} aria-hidden="true" />
            <span>{uploading ? `正在上传（${uploading} 张）…` : '选择或拍照上传答题照片'}</span>
            <small>支持 JPG/PNG，可多选</small>
            <input
              aria-label="添加答题照片"
              type="file"
              accept="image/png,image/jpeg"
              multiple
              disabled={busy}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                void addFiles(files);
              }}
            />
          </label>

          {problems.length > 0 && (
            <ul className="wb-problems" role="alert">
              {problems.map((problem) => (
                <li key={problem}>
                  <TriangleAlert size={14} aria-hidden="true" />
                  {problem}
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="wb-inline-error">{error}</p>}

          {pages.length === 0 ? (
            <p className="wb-empty">还没有上传答题照片。先上传照片，才能发起批改。</p>
          ) : (
            <ol className="wb-pages">
              {pages.map((page, index) => (
                <li key={page.fileId}>
                  <span className="wb-page-no">第 {page.pageNo} 页</span>
                  <span className="wb-page-thumb">
                    {previews[page.name] ? (
                      <img src={previews[page.name]} alt={`${page.name} 预览`} />
                    ) : (
                      <FileImage size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="wb-page-name">{page.name}</span>
                  <span className="wb-page-actions">
                    <Button
                      variant="secondary"
                      disabled={busy || index === 0}
                      aria-label={`上移第 ${page.pageNo} 页`}
                      onClick={() => void move(index, -1)}
                    >
                      上移
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || index === pages.length - 1}
                      aria-label={`下移第 ${page.pageNo} 页`}
                      onClick={() => void move(index, 1)}
                    >
                      下移
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      aria-label={`移除第 ${page.pageNo} 页`}
                      onClick={() => void remove(page.fileId)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      移除
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
