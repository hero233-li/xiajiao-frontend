import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { errorMessage } from '../api/errors';
export function ConfirmDialog({ open, title, message, onClose, onConfirm }: { open: boolean; title: string; message: string; onClose: () => void; onConfirm: () => void | Promise<void> }) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const epoch = useRef(0);
  useEffect(() => { epoch.current += 1; setBusy(false); setError(''); return () => { epoch.current += 1; }; }, [open]);
  const confirm = async () => { if (busy) return; const attempt = epoch.current; setBusy(true); setError(''); try { await onConfirm(); if (epoch.current === attempt) onClose(); } catch (cause) { if (epoch.current === attempt) setError(errorMessage(cause)); } finally { if (epoch.current === attempt) setBusy(false); } };
  return <Modal open={open} title={title} onClose={onClose}><p>{message}</p><div className="modal-actions"><Button variant="secondary" onClick={onClose}>取消</Button><Button loading={busy} error={error} onClick={() => { void confirm(); }}>确认</Button></div></Modal>;
}
