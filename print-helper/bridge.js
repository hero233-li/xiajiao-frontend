window.addEventListener('message', async event => {
  if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'zhitu-print') return;
  const {id, action, payload} = event.data;
  if (typeof id !== 'string' || !['status','upload','delete'].includes(action)) return;
  try {
    const reply = await chrome.runtime.sendMessage({action,payload});
    window.postMessage({source:'zhitu-print-helper',id,...reply},location.origin);
  } catch { window.postMessage({source:'zhitu-print-helper',id,error:'打印助手连接已失效，请刷新知途页面'},location.origin); }
});
