import React, { useEffect, useRef, useState } from 'react';
export default function DeleteDialog({ target, busy, error, onCancel, onConfirm }) {
 const dialog = useRef(null); const [confirmation,setConfirmation]=useState('');
 useEffect(()=>{const element=dialog.current;const previous=document.activeElement;setConfirmation('');if(target)element.showModal();return()=>{element.close();previous?.focus();};},[target]);
 const all=target?.all;
 return <dialog ref={dialog} className="delete-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}>
 <span className="eyebrow">WARNING · PERMANENT ACTION</span><h2 id="delete-title">{all?'Delete all keys?':'Delete this key?'}</h2>
 <p id="delete-description">{all?'This removes every key in the connected Redis database, including keys outside the current search and Cache Lab source, cache, and history records. It cannot be undone.':`The key “${target?.key || ''}” and its value will be permanently removed.`}</p>
 {all&&<><label className="field-label" htmlFor="confirm-delete">Type DELETE ALL to confirm</label><input id="confirm-delete" autoComplete="off" value={confirmation} disabled={busy} onChange={event=>setConfirmation(event.target.value)}/></>}
 {error&&<p role="alert">{error}</p>}<div className="editor-actions"><button autoFocus className="button button-light" disabled={busy} onClick={onCancel}>Cancel</button><button className="button button-danger" disabled={busy||(all&&confirmation!=='DELETE ALL')} onClick={onConfirm}>{busy?'Deleting…':all?'Delete all keys':'Delete key'}</button></div>
 </dialog>;
}
