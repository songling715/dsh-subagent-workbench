window.__ModuleLoader__.load({
  id: 'dsh-subagent-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const branchOverlayStore = {
      element: null,
      listeners: new Set(),
      getSnapshot() { return this.element },
      subscribe(listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
      },
      set(element) {
        this.element = element
        for (const listener of [...this.listeners]) listener()
      },
    }

    function BranchViewOverlay() {
      const [element, setElement] = React.useState(branchOverlayStore.getSnapshot())
      const hostRef = React.useRef(null)
      React.useEffect(() => branchOverlayStore.subscribe(() => {
        setElement(branchOverlayStore.getSnapshot())
      }), [])
      React.useLayoutEffect(() => {
        const node = hostRef.current
        if (!node || !element) return
        const root = node.getRootNode()
        const doc = node.ownerDocument
        const target = root && root.nodeType === 11 ? root : doc.head
        if (!target || (target.querySelector && target.querySelector('#dsh-sw-overlay-style'))) return
        const style = doc.createElement('style')
        style.id = 'dsh-sw-overlay-style'
        style.textContent = CSS
        target.appendChild(style)
      }, [element])
      if (!element) return null
      return h('div', { ref: hostRef, className: 'dsh-sw-overlay-host' }, element)
    }

    let activeCtx = null
    let activeRemote = null
    let activeRight = null
    let activeLayout = null
    let activeSessions = null
    let tabTypeReady = false
    const AUTO_OPEN_ONCE = false

    const CSS = `
.dsh-sw { height:100%; min-height:100%; overflow:auto; background-color:var(--dsw-alias-bg-base,#fafafa);
  background-image:radial-gradient(120% 70% at 100% 0%, color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 7%, transparent), transparent 58%);
  color:var(--dsw-alias-label-primary,#17171a); font-family:var(--dsw-font-ui,'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif);
  font-size:13px; line-height:1.5; }
.dsh-sw *, .dsh-sw *::before, .dsh-sw *::after { box-sizing:border-box; }
.dsh-sw-head { position:sticky; top:0; z-index:2; display:flex; align-items:center; padding:10px 18px;
  background:var(--dsw-alias-bg-base,#fafafa); border-bottom:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  backdrop-filter:blur(6px); }
.dsh-sw-headinner { display:flex; align-items:center; gap:8px; width:100%; margin:0; }
.dsh-sw-title { margin:0; font-size:14px; font-weight:650; letter-spacing:.1px; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-chip { display:inline-flex; align-items:center; height:22px; padding:0 9px; font-size:10.5px;
  color:var(--dsw-alias-label-secondary,#6b6b76);
  background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 6%, var(--dsw-alias-bg-layer-2,#f1f1f4));
  border-radius:999px; white-space:nowrap; }
.dsh-sw-refresh { margin-left:auto; width:26px; height:26px; border:1px solid transparent; border-radius:7px; background:transparent;
  display:grid; place-items:center; color:var(--dsw-alias-label-secondary,#6b6b76); cursor:pointer; }
.dsh-sw-refresh:hover { background:var(--dsw-alias-bg-layer-2,#f1f1f4); color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-body { width:100%; margin:0; padding:14px 18px 24px; display:flex; flex-direction:column; gap:14px; container-type:inline-size; }
.dsh-sw-card { border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 13%, var(--dsw-alias-border-l1,#e6e6ea));
  border-radius:16px; padding:14px 14px 12px; background:var(--dsw-alias-bg-layer-1,#fff);
  background-image:linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 4%, var(--dsw-alias-bg-layer-1,#fff)), var(--dsw-alias-bg-layer-1,#fff) 48%);
  box-shadow:0 1px 2px rgba(16,16,24,.04),0 18px 40px -28px rgba(16,16,24,.45); }
.dsh-sw-cardhead { display:flex; align-items:center; gap:9px; margin-bottom:12px; }
.dsh-sw-cardicon { width:26px; height:26px; border-radius:8px; display:grid; place-items:center;
  color:var(--dsw-alias-brand-primary,#4d6bfe);
  background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 11%, transparent); }
.dsh-sw-cardtitle { font-size:13px; font-weight:650; letter-spacing:.1px; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-cardgrid { display:grid; grid-template-columns:1fr; gap:12px; }
.dsh-sw-col-main { min-width:0; }
.dsh-sw-col-side { display:flex; flex-direction:column; gap:9px; min-width:0; }
.dsh-sw-col-side .dsh-sw-seg { margin-top:0; }
.dsh-sw-col-side .dsh-sw-hint { margin-top:0; }
.dsh-sw-col-side .dsh-sw-namewide { width:100%; }
.dsh-sw-col-side .dsh-sw-primarywide { width:100%; justify-content:center; height:36px; }
@container (min-width: 620px) {
  .dsh-sw-cardgrid { grid-template-columns:minmax(0,1fr) 270px; gap:16px; align-items:stretch; }
  .dsh-sw-col-main .dsh-sw-textarea { height:100%; min-height:170px; }
  .dsh-sw-col-side .dsh-sw-primarywide { margin-top:auto; }
}
.dsh-sw-kbd { font-size:9.5px; color:var(--dsw-alias-label-secondary,#6b6b76); border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-radius:5px; padding:1px 4px; font-family:ui-monospace,Consolas,monospace; }
.dsh-sw-textarea { display:block; width:100%; min-height:84px; max-height:220px; resize:vertical;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 9%, var(--dsw-alias-border-l1,#e6e6ea));
  border-radius:11px; padding:11px 12px; background:var(--dsw-alias-bg-layer-2,#fafafc); color:var(--dsw-alias-label-primary,#17171a);
  font:inherit; font-size:13px; line-height:1.6; outline:none; transition:border-color .16s, box-shadow .16s, background .16s; }
.dsh-sw-textarea::placeholder { color:var(--dsw-alias-label-secondary,#6b6b76); opacity:.75; }
.dsh-sw-textarea:focus { border-color:var(--dsw-alias-brand-primary,#4d6bfe); background:var(--dsw-alias-bg-layer-1,#fff);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 15%, transparent); }
.dsh-sw-seg { display:flex; gap:2px; margin-top:9px; padding:3px; border-radius:10px;
  background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 6%, var(--dsw-alias-bg-layer-2,#f1f1f4)); }
.dsh-sw-segbtn { flex:1; display:flex; align-items:center; justify-content:center; gap:4px; border:0; border-radius:8px;
  padding:6px 4px; background:transparent; color:var(--dsw-alias-label-secondary,#6b6b76); font:inherit; font-size:11.5px;
  cursor:pointer; transition:background .15s,color .15s,box-shadow .15s; }
.dsh-sw-segbtn[data-on="1"] { background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-brand-primary,#4d6bfe);
  font-weight:600; box-shadow:0 1px 2px rgba(16,16,24,.10),0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 10%, transparent); }
.dsh-sw-hint { display:flex; gap:5px; align-items:flex-start; margin-top:7px; font-size:10px; line-height:1.45;
  color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-hint svg { flex:none; margin-top:1px; opacity:.75; }
.dsh-sw-chips { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:10px; }
.dsh-sw-chipinput { width:112px; height:34px; border:1px solid transparent; border-radius:9px;
  background:var(--dsw-alias-bg-layer-2,#f1f1f4); padding:0 11px; color:var(--dsw-alias-label-primary,#17171a);
  font:inherit; font-size:12px; outline:none; transition:border-color .15s,box-shadow .15s,background .15s; }
.dsh-sw-chipinput::placeholder { color:var(--dsw-alias-label-secondary,#6b6b76); opacity:.8; }
.dsh-sw-chipinput:focus { border-color:var(--dsw-alias-brand-primary,#4d6bfe); background:var(--dsw-alias-bg-layer-1,#fff);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 12%, transparent); }
.dsh-sw-switch { display:flex; align-items:center; gap:7px; font-size:10.5px; color:var(--dsw-alias-label-secondary,#6b6b76);
  cursor:pointer; user-select:none; }
.dsh-sw-switch input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.dsh-sw-switchtrack { position:relative; width:28px; height:16px; flex:none; border-radius:999px;
  background:var(--dsw-alias-bg-layer-2,#f1f1f4); border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  transition:background .15s, border-color .15s; }
.dsh-sw-switchtrack i { position:absolute; top:1px; left:1px; width:12px; height:12px; border-radius:50%;
  background:var(--dsw-alias-bg-layer-1,#fff); box-shadow:0 1px 2px rgba(16,16,24,.2); transition:transform .15s, background .15s; }
.dsh-sw-switch input:checked + .dsh-sw-switchtrack { background:var(--dsw-alias-brand-primary,#4d6bfe);
  border-color:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-switch input:checked + .dsh-sw-switchtrack i { transform:translateX(12px); background:#fff; }
.dsh-sw-switch input:focus-visible + .dsh-sw-switchtrack { outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 55%, transparent); outline-offset:2px; }
.dsh-sw-chip { display:inline-flex; align-items:center; height:24px; padding:0 9px; border-radius:7px;
  background:var(--dsw-alias-bg-layer-2,#f1f1f4); color:var(--dsw-alias-label-secondary,#6b6b76); font-size:11px; white-space:nowrap; }
.dsh-sw-runrow { display:flex; align-items:center; justify-content:flex-end; gap:10px; margin-top:10px; }
.dsh-sw-runhint { font-size:10px; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-utility { width:28px; height:28px; padding:0; border:0; border-radius:var(--dsw-radius-sm,6px); background:transparent;
  display:grid; place-items:center; color:var(--dsw-alias-label-tertiary,#8a8a93); cursor:pointer; }
.dsh-sw-utility:hover { background:var(--dsw-alias-interactive-bg-hover,rgba(16,16,24,.05)); color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-utility:active { background:var(--dsw-alias-interactive-bg-active,rgba(16,16,24,.08)); }
.dsh-sw-primary { display:flex; align-items:center; gap:4px; height:32px; padding:0 12px; border:0; border-radius:10px;
  background:var(--dsw-alias-brand-primary,#4d6bfe);
  background-image:linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 86%, white), var(--dsw-alias-brand-primary,#4d6bfe));
  color:#fff; font:inherit; font-size:12px; font-weight:600; letter-spacing:.2px; cursor:pointer; white-space:nowrap;
  box-shadow:0 1px 0 rgba(255,255,255,.18) inset,0 10px 22px -12px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 65%, transparent);
  transition:transform .14s, box-shadow .14s, filter .14s; }
.dsh-sw-primary:hover:not(:disabled) { filter:brightness(1.02); transform:translateY(-1px);
  box-shadow:0 1px 0 rgba(255,255,255,.22) inset,0 14px 26px -12px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 70%, transparent); }
.dsh-sw-primary:active:not(:disabled) { transform:translateY(0); }
.dsh-sw-primary:disabled { opacity:.5; cursor:default; box-shadow:none; transform:none; }
.dsh-sw-error { margin-top:8px; padding:6px 8px; border-radius:7px; background:rgba(220,38,38,.08);
  color:var(--dsw-alias-state-error-primary,#dc2626); font-size:10.5px; line-height:1.45; white-space:pre-wrap; word-break:break-word; }
.dsh-sw-section { display:flex; align-items:center; gap:6px; margin:0 1px; }
.dsh-sw-section-title { font-size:11px; font-weight:600; color:var(--dsw-alias-label-secondary,#6b6b76); letter-spacing:.2px; }
.dsh-sw-section-count { min-width:16px; height:16px; padding:0 5px; display:inline-flex; align-items:center; justify-content:center;
  border-radius:8px; background:var(--dsw-alias-bg-layer-2,#f1f1f4); font-size:9.5px; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-list { display:flex; flex-direction:column; gap:6px; }
.dsh-sw-item { display:flex; gap:10px; align-items:flex-start; padding:10px 12px; border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-radius:12px; background:var(--dsw-alias-bg-layer-1,#fff); box-shadow:0 1px 2px rgba(16,16,24,.03); cursor:pointer;
  transition:transform .14s, box-shadow .14s, border-color .14s, background .14s; }
.dsh-sw-item:focus-visible { outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 55%, transparent); outline-offset:2px; }
.dsh-sw-item:hover { transform:translateY(-1px); border-color:var(--dsw-alias-border-l2,#d8d8de);
  box-shadow:0 10px 24px -18px rgba(16,16,24,.45); }
.dsh-sw-item[data-run="1"] { border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 20%, var(--dsw-alias-border-l1,#e6e6ea));
  background-image:linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 3%, var(--dsw-alias-bg-layer-1,#fff)), var(--dsw-alias-bg-layer-1,#fff) 40%); }
.dsh-sw-dot { position:relative; flex:none; width:7px; height:7px; margin-top:5px; border-radius:50%;
  background:var(--dsw-alias-state-idle-primary,#9a9aa2); }
.dsh-sw-dot[data-run="1"] { background:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-dot[data-run="1"]::after { content:''; position:absolute; inset:-4px; border-radius:50%;
  border:2px solid rgba(77,107,254,.20); animation:dshPulse 1.7s ease-out infinite; }
.dsh-sw-main { flex:1; min-width:0; }
.dsh-sw-nm { font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary,#17171a);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-sw-desc { font-size:10.5px; line-height:1.45; color:var(--dsw-alias-label-secondary,#6b6b76);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-sw-meta { margin-top:2px; font-size:9.5px; color:var(--dsw-alias-label-secondary,#6b6b76); opacity:.78; }
.dsh-sw-actions { display:flex; gap:3px; flex:none; }
.dsh-sw-ghost { display:flex; align-items:center; gap:3px; height:24px; padding:0 7px; border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-radius:6px; background:transparent; color:var(--dsw-alias-label-secondary,#6b6b76); font:inherit; font-size:10px; cursor:pointer; }
.dsh-sw-ghost:hover { background:var(--dsw-alias-bg-layer-2,#f1f1f4); color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-ghost:disabled { opacity:.4; cursor:default; }
.dsh-sw-ghost:disabled:hover { background:transparent; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-empty { max-width:420px; margin:6px auto 0; padding:28px 20px 26px; border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 8%, var(--dsw-alias-border-l1,#e6e6ea));
  border-radius:16px; text-align:center; color:var(--dsw-alias-label-secondary,#6b6b76);
  background:var(--dsw-alias-bg-layer-1,#fff);
  background-image:linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 4%, var(--dsw-alias-bg-layer-1,#fff)), var(--dsw-alias-bg-layer-1,#fff) 70%);
  box-shadow:0 16px 36px -30px rgba(16,16,24,.4); }
.dsh-sw-emptyicon { width:42px; height:42px; margin:0 auto 10px; border-radius:12px; display:grid; place-items:center;
  color:var(--dsw-alias-brand-primary,#4d6bfe);
  background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 10%, transparent); }
.dsh-sw-emptytitle { font-size:12.5px; font-weight:600; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-emptysub { margin-top:3px; font-size:11px; line-height:1.6; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-group { display:flex; flex-direction:column; gap:6px; }
.dsh-sw-cap { display:flex; flex-direction:column; gap:5px; margin-top:2px; }
.dsh-sw-cap-row { display:flex; justify-content:space-between; font-size:9.5px; color:var(--dsw-alias-label-secondary,#6b6b76); opacity:.85; }
.dsh-sw-bar { height:4px; border-radius:2px; background:var(--dsw-alias-bg-layer-2,#f1f1f4); overflow:hidden; }
.dsh-sw-bar > i { display:block; height:100%; border-radius:2px;
  background:linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 70%, white), var(--dsw-alias-brand-primary,#4d6bfe));
  transition:width .2s; }
.dsh-sw-headicon { display:grid; place-items:center; color:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:2px;
  font-size:9.5px; color:var(--dsw-alias-label-secondary,#6b6b76); opacity:.85; }
.dsh-sw-launch, .dsh-sw-pill { display:inline-flex; align-items:center; gap:4px; min-height:28px; padding:3px 2px;
  border:0; border-radius:var(--dsw-radius-sm,6px); background:transparent; color:var(--dsw-alias-label-tertiary,#8a8a93);
  font:inherit; font-size:12px; line-height:18px; cursor:pointer; white-space:nowrap; }
.dsh-sw-launch:hover, .dsh-sw-pill:hover { color:var(--dsw-alias-label-primary,#17171a); background:transparent; }
.dsh-sw-launch:active, .dsh-sw-pill:active { color:var(--dsw-alias-label-primary,#17171a);
  background:var(--dsw-alias-interactive-bg-active,rgba(16,16,24,.08)); }
.dsh-sw-launch svg, .dsh-sw-pill svg { flex:none; }
.dsh-sw-pill-dot { width:5px; height:5px; border-radius:50%; background:var(--dsw-alias-brand-primary,#4d6bfe); opacity:.9; }
.dsh-sw-spin { animation:dshSpin .9s linear infinite; }
.dsh-sw button:focus-visible, .dsh-sw input:focus-visible, .dsh-sw textarea:focus-visible {
  outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 55%, transparent); outline-offset:2px; }
.dsh-sw-launch:focus:not(:focus-visible), .dsh-sw-pill:focus:not(:focus-visible),
.dsh-sw-utility:focus:not(:focus-visible), .dsh-sw-refresh:focus:not(:focus-visible) {
  outline:none; box-shadow:none; }
.dsh-sw-launch:focus-visible, .dsh-sw-pill:focus-visible, .dsh-sw-utility:focus-visible {
  outline:none; color:var(--dsw-alias-label-primary,#17171a); }
/* Native header actions: no chrome at rest, on hover, while focused, or while pressed. */
.dsh-sw-launch, .dsh-sw-pill, .dsh-sw-utility {
  border:0 !important; background:transparent !important; box-shadow:none !important; }
.dsh-sw-launch:hover, .dsh-sw-pill:hover, .dsh-sw-utility:hover,
.dsh-sw-launch:active, .dsh-sw-pill:active, .dsh-sw-utility:active,
.dsh-sw-launch:focus, .dsh-sw-pill:focus, .dsh-sw-utility:focus,
.dsh-sw-launch:focus-visible, .dsh-sw-pill:focus-visible, .dsh-sw-utility:focus-visible {
  background:transparent !important; box-shadow:none !important; outline:none !important; }
.dsh-sw-tabs { display:flex; gap:4px; padding:8px 18px 0; background:var(--dsw-alias-bg-base,#fafafa); }
.dsh-sw-tab { border:0; background:transparent; color:var(--dsw-alias-label-secondary,#6b6b76);
  font:inherit; font-size:11.5px; padding:5px 11px; border-radius:7px; cursor:pointer; }
.dsh-sw-tab[data-on="1"] { color:var(--dsw-alias-label-primary,#17171a); background:var(--dsw-alias-bg-layer-2,#f1f1f4); font-weight:600; }
.dsh-sw-branchcard { display:flex; flex-direction:column; gap:10px; padding:14px; border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  border-radius:12px; background:var(--dsw-alias-bg-layer-1,#fff); }
.dsh-sw-branchhead { display:flex; align-items:center; gap:8px; }
.dsh-sw-branchhead .dsh-sw-ghost:last-child { margin-left:auto; }
.dsh-sw-branchselects { display:flex; gap:10px; flex-wrap:wrap; }
.dsh-sw-branchselect { display:flex; align-items:center; gap:5px; flex:1 1 140px; min-width:0;
  font-size:10px; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-branchselect select { flex:1; min-width:0; height:30px; padding:0 27px 0 10px; border-radius:9px;
  appearance:none; -webkit-appearance:none; border:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  background-color:var(--dsw-alias-bg-layer-1,#fff);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%238a8a93' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 8px center; background-size:11px;
  box-shadow:0 1px 2px rgba(16,16,24,.05); color:var(--dsw-alias-label-primary,#17171a);
  font:inherit; font-size:10.5px; cursor:pointer; transition:border-color .15s, box-shadow .15s; }
.dsh-sw-branchselect select:hover { border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 28%, var(--dsw-alias-border-l1,#e6e6ea)); }
.dsh-sw-branchselect select:focus-visible { outline:none; border-color:var(--dsw-alias-brand-primary,#4d6bfe);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 12%, transparent); }
.dsh-sw-modegroup { display:flex; align-items:center; gap:6px; flex:0 1 auto; }
.dsh-sw-modelabel { font-size:9.5px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-modes { display:inline-flex; gap:2px; padding:3px; border-radius:9px;
  background:var(--dsw-alias-bg-layer-2,#f1f1f4); border:1px solid var(--dsw-alias-border-l1,#e6e6ea); }
.dsh-sw-modebtn { border:0; background:transparent; color:var(--dsw-alias-label-secondary,#6b6b76);
  font:inherit; font-size:10.5px; padding:4px 9px; border-radius:6px; cursor:pointer; }
.dsh-sw-modebtn[data-on="1"] { background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#17171a);
  font-weight:600; box-shadow:0 1px 2px rgba(16,16,24,.12); }
.dsh-sw-modehint { font-size:9.5px; line-height:1.5; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-laneexpand { margin-top:6px; width:100%; height:24px; border-radius:6px; cursor:pointer;
  border:1px dashed var(--dsw-alias-border-l1,#e6e6ea); background:transparent;
  color:var(--dsw-alias-label-tertiary,#8a8a93); font:inherit; font-size:9.5px; }
.dsh-sw-laneexpand:hover { background:var(--dsw-alias-bg-layer-2,#f1f1f4); color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-branchhint { margin-left:auto; font-size:10px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-branch { display:flex; flex-direction:column; gap:5px; padding-left:10px;
  border-left:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 22%, var(--dsw-alias-border-l1,#e6e6ea)); }
.dsh-sw-branchsession { display:flex; align-items:center; gap:6px; font-size:10.5px; flex-wrap:wrap; }
.dsh-sw-branchdot { width:6px; height:6px; border-radius:50%; background:var(--dsw-alias-brand-primary,#4d6bfe); flex:none; }
.dsh-sw-branchname { font-weight:600; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-branchmeta { color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-turns { display:flex; flex-direction:column; gap:5px; }
.dsh-sw-turn { display:flex; gap:8px; align-items:center; height:46px; box-sizing:border-box; padding:8px 9px; border-radius:9px;
  border:1px solid transparent; background:var(--dsw-alias-bg-layer-2,#f1f1f4); cursor:pointer; font-size:10.5px; }
.dsh-sw-turn:hover { background:var(--dsw-alias-bg-layer-1,#fff); border-color:var(--dsw-alias-border-l1,#e6e6ea); }
.dsh-sw-turn[data-inherited="1"] { opacity:.62; }
.dsh-sw-turn .dsh-sw-nodecheck { width:15px; height:15px; border-radius:4px; font-size:10px; }
.dsh-sw-turnno { flex:none; width:28px; font-weight:600; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-turntext { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:1px; }
.dsh-sw-turnuser { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-turnassistant { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-turntokens { flex:none; font-size:9.5px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-tag { flex:none; font-size:9px; padding:1px 5px; border-radius:4px;
  background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-branchempty { padding:16px; text-align:center; font-size:11px; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-branchlegend { font-size:9.5px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-lanes { position:relative; display:flex; gap:10px; overflow-x:auto; padding:2px 0 6px; align-items:flex-start; }
.dsh-sw-forkmap { position:absolute; left:0; top:0; pointer-events:none; overflow:visible; }
.dsh-sw-lane { flex:0 0 178px; border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-top:2px solid
  color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 55%, var(--dsw-alias-border-l1,#e6e6ea));
  border-radius:9px; background:var(--dsw-alias-bg-layer-1,#fff); padding:9px; }
.dsh-sw-lane[data-depth="1"] { border-top-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 28%, var(--dsw-alias-border-l1,#e6e6ea)); }
.dsh-sw-lanehead { display:flex; align-items:center; gap:5px; }
.dsh-sw-lanedot { width:6px; height:6px; border-radius:50%; background:var(--dsw-alias-brand-primary,#4d6bfe); flex:none; }
.dsh-sw-lanename { font-size:11px; font-weight:650; color:var(--dsw-alias-label-primary,#17171a); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-sw-laneparent { margin-left:auto; font-size:9px; color:var(--dsw-alias-label-tertiary,#8a8a93); flex:none; }
.dsh-sw-lanelabel { margin-top:2px; font-size:9.5px; color:var(--dsw-alias-label-secondary,#6b6b76);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-sw-lanemeta { margin-top:1px; font-size:9px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-lanebody { position:relative; margin-top:8px; padding-left:9px; display:flex; flex-direction:column; gap:5px;
  max-height:250px; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; padding-right:3px; }
.dsh-sw-lanebody::before { content:''; position:absolute; left:3px; top:0; bottom:0; width:1px; background:var(--dsw-alias-border-l1,#e6e6ea); }
.dsh-sw-node { display:flex; align-items:flex-start; gap:5px; min-width:0; padding:3px 4px; border-radius:5px; }
.dsh-sw-node[data-inherited="1"] { opacity:.55; }
.dsh-sw-nodedot { width:7px; height:7px; border-radius:50%; border:1.5px solid var(--dsw-alias-brand-primary,#4d6bfe);
  background:var(--dsw-alias-bg-layer-1,#fff); flex:none; margin-top:2px; }
.dsh-sw-node[data-inherited="1"] .dsh-sw-nodedot { border-color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-nodeno { flex:none; font-size:9px; font-weight:600; color:var(--dsw-alias-label-secondary,#6b6b76); margin-top:1px; }
.dsh-sw-nodebody { min-width:0; display:flex; flex-direction:column; gap:1px; }
.dsh-sw-nodeuser { font-size:9.5px; color:var(--dsw-alias-label-primary,#17171a);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-sw-nodemeta { font-size:8.5px; color:var(--dsw-alias-label-tertiary,#8a8a93);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-sw-node { display:flex; align-items:flex-start; gap:5px; min-width:0; padding:3px 4px; border-radius:5px; cursor:pointer; }
.dsh-sw-node[data-selected="1"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 8%, transparent); }
.dsh-sw-nodecheck { width:12px; height:12px; flex:none; display:grid; place-items:center; margin-top:1px;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-radius:3px; font-size:9px; line-height:1;
  color:#fff; background:var(--dsw-alias-bg-layer-1,#fff); }
.dsh-sw-node[data-selected="1"] .dsh-sw-nodecheck { background:var(--dsw-alias-brand-primary,#4d6bfe);
  border-color:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-importbar { margin-top:2px; padding-top:10px; border-top:1px solid var(--dsw-alias-border-l1,#e6e6ea);
  display:flex; flex-direction:column; gap:7px; }
.dsh-sw-importrow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.dsh-sw-importcount { font-size:10.5px; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-importtarget { margin-left:auto; display:flex; align-items:center; gap:5px; font-size:10px;
  color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-importtarget select { height:26px; max-width:160px; padding:0 6px; border-radius:6px;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea); background:var(--dsw-alias-bg-layer-1,#fff);
  color:var(--dsw-alias-label-primary,#17171a); font:inherit; font-size:10.5px; }
.dsh-sw-importrow .dsh-sw-seg { flex:0 1 auto; }
.dsh-sw-importrow .dsh-sw-primary { margin-left:auto; height:30px; padding:0 16px; }
.dsh-sw-importnote { font-size:10.5px; color:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-importhint { font-size:9.5px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-opslist { display:flex; flex-direction:column; gap:9px; max-height:44vh; overflow:auto; padding-right:2px; }
.dsh-sw-lanebody, .dsh-sw-opslist, .dsh-sw-modalbody, .dsh-sw-lanes, .dsh-sw-body {
  scrollbar-width: thin; scrollbar-color: transparent transparent;
}
.dsh-sw-lanebody:hover, .dsh-sw-opslist:hover, .dsh-sw-modalbody:hover, .dsh-sw-lanes:hover, .dsh-sw-body:hover {
  scrollbar-color: rgba(120,120,135,.32) transparent;
}
.dsh-sw-lanebody::-webkit-scrollbar, .dsh-sw-opslist::-webkit-scrollbar, .dsh-sw-modalbody::-webkit-scrollbar,
.dsh-sw-lanes::-webkit-scrollbar, .dsh-sw-body::-webkit-scrollbar { width:6px; height:6px; }
.dsh-sw-lanebody::-webkit-scrollbar-thumb, .dsh-sw-opslist::-webkit-scrollbar-thumb,
.dsh-sw-modalbody::-webkit-scrollbar-thumb, .dsh-sw-lanes::-webkit-scrollbar-thumb,
.dsh-sw-body::-webkit-scrollbar-thumb { background:transparent; border-radius:3px; }
.dsh-sw-lanebody:hover::-webkit-scrollbar-thumb, .dsh-sw-opslist:hover::-webkit-scrollbar-thumb,
.dsh-sw-modalbody:hover::-webkit-scrollbar-thumb, .dsh-sw-lanes:hover::-webkit-scrollbar-thumb,
.dsh-sw-body:hover::-webkit-scrollbar-thumb { background:rgba(120,120,135,.32); }
.dsh-sw-lanebody::-webkit-scrollbar-track, .dsh-sw-opslist::-webkit-scrollbar-track,
.dsh-sw-modalbody::-webkit-scrollbar-track, .dsh-sw-lanes::-webkit-scrollbar-track,
.dsh-sw-body::-webkit-scrollbar-track { background:transparent; }
.dsh-sw-lanebody::-webkit-scrollbar-button, .dsh-sw-opslist::-webkit-scrollbar-button,
.dsh-sw-modalbody::-webkit-scrollbar-button, .dsh-sw-lanes::-webkit-scrollbar-button,
.dsh-sw-body::-webkit-scrollbar-button { display:none; }
.dsh-sw-lanebody::-webkit-scrollbar-corner, .dsh-sw-opslist::-webkit-scrollbar-corner,
.dsh-sw-modalbody::-webkit-scrollbar-corner, .dsh-sw-lanes::-webkit-scrollbar-corner,
.dsh-sw-body::-webkit-scrollbar-corner { background:transparent; }
.dsh-sw-branchgroup { display:flex; flex-direction:column; gap:4px; }
.dsh-sw-branchgroup .dsh-sw-turn { cursor:pointer; }
.dsh-sw-turn[data-selected="1"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 8%, var(--dsw-alias-bg-layer-2,#f1f1f4));
  border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 24%, var(--dsw-alias-border-l1,#e6e6ea)); }
.dsh-sw-turn[data-selected="1"] .dsh-sw-nodecheck { background:var(--dsw-alias-brand-primary,#4d6bfe);
  border-color:var(--dsw-alias-brand-primary,#4d6bfe); color:#fff; font-weight:700; }
.dsh-sw-viewbtn { margin-left:auto; height:27px; padding:0 12px; border-radius:7px; cursor:pointer;
  border:1px solid #c3ccff; background:#eef1ff; color:#3454e8; font:inherit; font-size:10.5px; font-weight:600;
  box-shadow:0 1px 2px rgba(52,84,232,.08); }
.dsh-sw-viewbtn:hover { background:#e4e9ff; border-color:#a9b7ff; }
.dsh-sw-viewbtn:active { background:#dbe2ff; }
.dsh-sw-modalbackdrop { position:fixed; inset:0; z-index:2147483000; display:flex; align-items:center; justify-content:center;
  padding:24px; background:rgba(10,10,20,.32); backdrop-filter:blur(2px); overflow:hidden; overscroll-behavior:contain; }
.dsh-sw-modal { width:min(1120px,94vw); height:min(720px,86vh); display:flex; flex-direction:column; overflow:hidden;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-radius:14px; background:var(--dsw-alias-bg-layer-1,#fff);
  box-shadow:0 24px 80px -24px rgba(10,10,20,.55); color:var(--dsw-alias-label-primary,#17171a);
  font-family:var(--dsw-font-ui,'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif); font-size:13px; }
.dsh-sw-modal *, .dsh-sw-modal *::before, .dsh-sw-modal *::after { box-sizing:border-box; }
.dsh-sw-modalhead { display:flex; align-items:center; gap:8px; padding:11px 16px;
  border-bottom:1px solid var(--dsw-alias-border-l1,#e6e6ea); }
.dsh-sw-modalicon { display:grid; place-items:center; color:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-modaltitle { font-size:13px; font-weight:650; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-modalhint { font-size:10px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-modalclose { margin-left:auto; width:28px; height:28px; border:0; border-radius:6px; background:transparent;
  color:var(--dsw-alias-label-secondary,#6b6b76); font-size:18px; line-height:1; cursor:pointer; }
.dsh-sw-modalclose:hover { background:var(--dsw-alias-bg-layer-2,#f1f1f4); color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-modalbody { flex:1; min-height:0; overflow:hidden; overscroll-behavior:contain; padding:14px 16px 18px; background:var(--dsw-alias-bg-base,#fafafa); }
.dsh-sw-modal .dsh-sw-branchcard { border:0; padding:0; background:transparent; }
.dsh-sw-modal .dsh-sw-branchhead, .dsh-sw-modal .dsh-sw-branchlegend { display:none; }
.dsh-sw-pickercard { position:relative; border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-radius:12px;
  background:var(--dsw-alias-bg-layer-1,#fff); box-shadow:0 1px 2px rgba(16,16,24,.05); }
.dsh-sw-pickerwrap { position:relative; }
.dsh-sw-pickerwrap + .dsh-sw-pickerwrap { border-top:1px solid var(--dsw-alias-border-l1,#e6e6ea); }
.dsh-sw-pickerrow { width:100%; height:42px; display:flex; align-items:center; gap:9px; padding:0 11px;
  border:0; background:transparent; color:inherit; font:inherit; cursor:pointer; text-align:left; }
.dsh-sw-pickerrow:hover { background:var(--dsw-alias-bg-layer-2,#f1f1f4); }
.dsh-sw-pickerwrap:first-child .dsh-sw-pickerrow { border-radius:12px 12px 0 0; }
.dsh-sw-pickerwrap:last-child .dsh-sw-pickerrow { border-radius:0 0 12px 12px; }
.dsh-sw-pickerlabel { flex:none; font-size:10.5px; color:var(--dsw-alias-label-secondary,#6b6b76); }
.dsh-sw-pickervalue { margin-left:auto; font-size:11px; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-pickerchevron { flex:none; display:grid; place-items:center; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-pickerpop { position:absolute; z-index:30; top:calc(100% + 6px); right:0; width:100%; padding:5px;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-radius:12px;
  background:var(--dsw-alias-bg-layer-1,#fff); box-shadow:0 20px 50px -26px rgba(16,16,24,.55); }
.dsh-sw-pickerpop-up { top:auto; bottom:calc(100% + 6px); }
.dsh-sw-pickeroption { width:100%; height:32px; display:flex; align-items:center; gap:7px; padding:0 9px;
  border:0; border-radius:7px; background:transparent; color:var(--dsw-alias-label-primary,#17171a);
  font:inherit; font-size:11px; cursor:pointer; text-align:left; }
.dsh-sw-pickeroption:hover { background:var(--dsw-alias-bg-layer-2,#f1f1f4); }
.dsh-sw-pickeroption[data-selected="1"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d6bfe) 8%, #fff);
  color:var(--dsw-alias-brand-primary,#4d6bfe); font-weight:600; }
.dsh-sw-pickercheck { margin-left:auto; color:var(--dsw-alias-brand-primary,#4d6bfe); font-size:11px; }
.dsh-sw-pickerempty { padding:8px 9px; color:var(--dsw-alias-label-tertiary,#8a8a93); font-size:10px; }
.dsh-sw-listtitle { display:flex; align-items:center; gap:8px; margin:13px 2px 7px;
  color:var(--dsw-alias-label-secondary,#6b6b76); font-size:10px; }
.dsh-sw-listcount { margin-left:auto; color:var(--dsw-alias-label-tertiary,#8a8a93); font-size:9.5px; }
.dsh-sw-moderow { display:flex; flex-direction:column; align-items:stretch; gap:6px; margin-top:11px; padding-top:10px;
  border-top:1px solid var(--dsw-alias-border-l1,#e6e6ea); }
.dsh-sw-modelabel { color:var(--dsw-alias-label-secondary,#6b6b76); font-size:10px; }
.dsh-sw-modes { width:100%; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:3px; padding:3px;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-radius:10px; background:var(--dsw-alias-bg-layer-2,#f1f1f4); }
.dsh-sw-modebtn { height:34px; padding:0 6px; border:0; border-radius:7px; background:transparent;
  color:var(--dsw-alias-label-secondary,#6b6b76); font:inherit; font-size:11.5px; cursor:pointer; }
.dsh-sw-modebtn[data-on="1"] { background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#17171a);
  font-weight:600; box-shadow:0 1px 3px rgba(16,16,24,.12); }
.dsh-sw-modehint { margin:7px 1px 0; color:var(--dsw-alias-label-tertiary,#8a8a93); font-size:9.5px; line-height:1.55; }
.dsh-sw-importbtn { width:100%; height:36px; margin-top:10px; border-radius:9px; font-size:11.5px;
  justify-content:center; text-align:center; }
.dsh-sw-overlay-host { display:contents; }
.dsh-sw-branchbody { display:flex; flex-direction:column; overflow:hidden; min-height:0; }
.dsh-sw-branchbody .dsh-sw-branchcard { display:flex; flex-direction:column; flex:1; min-height:0; }
.dsh-sw-branchbody .dsh-sw-opslist { flex:1; min-height:0; max-height:none; overflow:hidden; }
.dsh-sw-forkmodal { width:min(1120px,94vw); height:min(620px,86vh); max-height:none; }
.dsh-sw-forkmodal .dsh-sw-modalbody { flex:1; min-height:0; overflow:hidden; padding:16px 18px 18px;
  background:#fff; display:flex; }
.dsh-sw-forkview { flex:1; min-height:0; display:flex; flex-direction:column; gap:16px; }
.dsh-sw-forkmain { flex:none; display:flex; align-items:center; gap:10px; padding:12px 14px;
  border:1px solid var(--dsw-alias-border-l1,#e6e6ea); border-radius:12px; background:#fafafa; }
.dsh-sw-forkmaindot { width:8px; height:8px; border-radius:50%; background:var(--dsw-alias-brand-primary,#4d6bfe); flex:none; }
.dsh-sw-forkmainbody { display:flex; flex-direction:column; gap:2px; min-width:0; }
.dsh-sw-forkmaintitle { font-size:12px; font-weight:650; color:var(--dsw-alias-label-primary,#17171a); }
.dsh-sw-forkmainmeta { font-size:9.5px; color:var(--dsw-alias-label-tertiary,#8a8a93); }
.dsh-sw-forkmainbadge { margin-left:auto; padding:4px 8px; border-radius:6px; background:#f1f1f4;
  color:var(--dsw-alias-label-secondary,#6b6b76); font-size:9px; }
.dsh-sw-forkbar { flex:none; padding:4px 12px 0; }
.dsh-sw-forktrack { position:relative; height:48px; }
.dsh-sw-forkfill { position:absolute; left:0; right:0; top:32px; height:8px; border-radius:4px;
  background:linear-gradient(90deg, #8ea2ff, #4d6bfe); }
.dsh-sw-forktick { position:absolute; top:40px; width:1px; height:5px; background:#d9dbe4; }
.dsh-sw-forknode { position:absolute; top:0; transform:translateX(-50%); border:0; background:transparent;
  padding:0; cursor:pointer; display:flex; flex-direction:column; align-items:center; }
.dsh-sw-forknodelabel { display:block; padding:3px 7px; border-radius:6px; background:#f1f1f4;
  color:var(--dsw-alias-label-secondary,#6b6b76); font-size:9px; font-weight:600; white-space:nowrap; }
.dsh-sw-forknode::after { content:''; display:block; width:1px; height:18px; background:#c3ccff; }
.dsh-sw-forknode[data-on="1"] .dsh-sw-forknodelabel { background:var(--dsw-alias-brand-primary,#4d6bfe); color:#fff; }
.dsh-sw-forknode[data-on="1"]::after { background:var(--dsw-alias-brand-primary,#4d6bfe); }
.dsh-sw-forknodecount { position:absolute; top:-5px; right:-8px; min-width:14px; height:14px; border-radius:7px;
  background:#fff; border:1px solid #c3ccff; color:#3454e8; font-size:8px; display:grid; place-items:center; }
.dsh-sw-forkaxis { display:flex; justify-content:space-between; padding-top:3px; color:#8a8a93; font-size:8.5px; }
.dsh-sw-forkdetail { flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column;
  border:1px solid #e6e6ea; border-radius:12px; padding:12px 14px; background:#fff; }
.dsh-sw-forktask { flex:none; display:flex; align-items:center; gap:8px; min-width:0; padding:8px 10px; border-radius:8px;
  background:#f7f8fb; border:1px solid #eef0f4; }
.dsh-sw-forktasklabel { flex:none; font-size:9px; font-weight:600; color:#3454e8; }
.dsh-sw-forktasktext { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:9.5px; color:#4a4a55; }
.dsh-sw-forkrows { flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:5px; margin-top:10px; }
.dsh-sw-forkrow { flex:none; display:flex; align-items:center; gap:8px; min-height:38px; padding:7px 9px;
  border-radius:8px; background:#fafafa; border:1px solid #f0f0f3; cursor:pointer; }
.dsh-sw-forkrow:hover { background:#fff; border-color:#d9dbe4; }
.dsh-sw-forkrowdot { width:6px; height:6px; border-radius:50%; background:#4d6bfe; flex:none; }
.dsh-sw-forkrowname { font-size:10px; font-weight:600; color:#17171a; }
.dsh-sw-forkrowstatus { padding:2px 6px; border-radius:5px; background:#f1f1f4; color:#6b6b76; font-size:8px; }
.dsh-sw-forkrowmeta { margin-left:auto; color:#8a8a93; font-size:8.5px; }
.dsh-sw-forkrowlink { color:#3454e8; font-size:9px; }
.dsh-sw-forkhint { flex:1; display:flex; align-items:center; justify-content:center; text-align:center;
  padding:18px 14px; border:1px dashed #e6e6ea; border-radius:10px; color:#8a8a93; font-size:9.5px; }
@keyframes dshPulse { 0% { transform:scale(.8); opacity:.8 } 70% { transform:scale(1.5); opacity:0 } 100% { opacity:0 } }
@keyframes dshSpin { to { transform:rotate(360deg) } }
@media (prefers-reduced-motion:reduce) { .dsh-sw-dot[data-run="1"]::after,.dsh-sw-spin { animation:none; } }
`

    function service(ctx, key) {
      try {
        if (ctx && ctx[key]) return ctx[key]
        if (ctx && typeof ctx.get === 'function') return ctx.get(key)
      } catch (error) {
        // ignore unavailable services
      }
      return undefined
    }

    function remoteOf(ctx) { return activeRemote || service(ctx, 'remote') }
    function rightOf(ctx) { return activeRight || service(ctx, 'sidebarRight') }
    function layoutOf(ctx) { return activeLayout || service(ctx, 'layout') }
    function errorText(error) { return (error && error.message) || String(error) }

    function registerType(tabs, owner) {
      if (tabTypeReady) return true
      if (!tabs || typeof tabs.register !== 'function') return false
      try {
        const dispose = tabs.register({
          id: 'subagent-workbench',
          kind: 'subagent-workbench',
          title: () => '子代理',
        })
        tabTypeReady = true
        if (owner && typeof owner.effect === 'function' && typeof dispose === 'function') {
          try {
            owner.effect(() => () => {
              tabTypeReady = false
              try { dispose() } catch (error) { /* already gone */ }
            })
          } catch (error) {
            console.error('[subagent-workbench] tab type cleanup setup failed', error)
          }
        }
        return true
      } catch (error) {
        const message = String((error && error.message) || error)
        console.error('[subagent-workbench] tab type registration failed', error)
        if (message.includes('already')) {
          tabTypeReady = true
          return true
        }
        return false
      }
    }

    function ensureTabType(ctx) {
      if (tabTypeReady) return true
      return registerType(service(ctx, 'sidebarRightTabs'), ctx)
    }

    function tryOpenTab(ctx) {
      const right = rightOf(ctx)
      if (!right || typeof right.openTab !== 'function') return false
      try {
        right.openTab('subagent-workbench')
        return true
      } catch (error) {
        console.error('[subagent-workbench] openTab failed', error)
        return false
      }
    }

    function openWorkbench(ctx) {
      const layout = layoutOf(ctx)
      if (layout && typeof layout.openRightbar === 'function') {
        try { layout.openRightbar(true, false) } catch (error) { console.error(error) }
      }
      ensureTabType(ctx)
      if (tryOpenTab(ctx)) return
      let attempts = 0
      const timer = setInterval(() => {
        attempts += 1
        ensureTabType(ctx)
        if (tryOpenTab(ctx)) { clearInterval(timer); return }
        if (attempts >= 15) {
          clearInterval(timer)
          const right = rightOf(ctx)
          const tabs = service(ctx, 'sidebarRightTabs')
          const info = 'sidebarRight=' + Boolean(right)
            + ' openTab=' + Boolean(right && right.openTab)
            + ' sidebarRightTabs=' + Boolean(tabs)
            + ' typeReady=' + tabTypeReady
          console.error('[subagent-workbench] cannot open panel; ' + info)
          try { window.alert('子代理面板打开失败\n' + info) } catch (error) { /* ignore */ }
        }
      }, 200)
    }

    function icon(path, options) {
      const config = options || {}
      return h('svg', {
        width: config.size || 14,
        height: config.size || 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: config.strokeWidth || 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, path)
    }

    const IconPlus = (size) => icon(h('path', { d: 'M8 3v10M3 8h10' }), { size })
    const IconRefresh = (size) => icon([
      h('path', { key: 'a', d: 'M13 8a5 5 0 1 1-1.6-3.7' }),
      h('path', { key: 'b', d: 'M13 3.2v3h-3' }),
    ], { size })
    const IconArrow = (size) => icon([
      h('path', { key: 'a', d: 'M3.5 8h8.5' }),
      h('path', { key: 'b', d: 'M9.5 5.2L12.3 8l-2.8 2.8' }),
    ], { size: size || 12 })
    const IconStop = (size) => h('svg', {
      width: size || 12, height: size || 12, viewBox: '0 0 16 16', 'aria-hidden': 'true',
    }, h('rect', { x: 4.2, y: 4.2, width: 7.6, height: 7.6, rx: 1.6, fill: 'currentColor' }))
    const IconFork = (size) => icon([
      h('circle', { key: 'a', cx: 5, cy: 4, r: 1.7 }),
      h('circle', { key: 'b', cx: 5, cy: 12, r: 1.7 }),
      h('circle', { key: 'c', cx: 11, cy: 7.5, r: 1.7 }),
      h('path', { key: 'd', d: 'M5 5.7v4.6M6.7 8h2.6' }),
    ], { size: size || 12 })
    const IconChevron = (size) => icon(
      h('path', { d: 'M4 6l4 4 4-4' }),
      { size: size || 12, strokeWidth: 1.4 },
    )
    const IconSpark = (size) => icon([
      h('path', { key: 'a', d: 'M8 2.2l1.4 3.4L12.8 7l-3.4 1.4L8 11.8 6.6 8.4 3.2 7l3.4-1.4z' }),
    ], { size: size || 12 })
    const IconInfo = (size) => icon([
      h('circle', { key: 'a', cx: 8, cy: 8, r: 5.6 }),
      h('path', { key: 'b', d: 'M8 7.2v3.4M8 5.4v.2' }),
    ], { size: size || 11, strokeWidth: 1.4 })
    const IconUsers = (size) => icon([
      h('circle', { key: 'a', cx: 5.4, cy: 5, r: 2 }),
      h('path', { key: 'b', d: 'M2.4 12.4c.3-2.1 1.5-3.2 3-3.2s2.7 1.1 3 3.2' }),
      h('path', { key: 'c', d: 'M10 6.2c.7.2 1.2.8 1.2 1.6 0 .7-.3 1.3-.8 1.6' }),
      h('path', { key: 'd', d: 'M10.8 9.6c1.1.4 1.8 1.4 2 2.8' }),
    ], { size: size || 13, strokeWidth: 1.3 })

    function HeaderAction() {
      return h('button', {
        type: 'button',
        className: 'dsh-sw-launch',
        title: '打开子代理工作台',
        onClick: event => {
          if (event.detail > 0) event.currentTarget.blur()
          openWorkbench(activeCtx)
        },
      }, IconPlus(13), '子代理')
    }

    function CatalogPill(props) {
      let catalog
      try { catalog = props.useProjection('subagentCatalog') } catch (error) { catalog = undefined }
      const rows = Array.isArray(catalog) ? catalog : []
      let active = 0
      try {
        const sessions = props.useSessions(state => state)
        const byId = sessions && sessions.byId
        if (byId) {
          active = rows.filter(row => {
            const summary = byId[row.id]
            return Boolean(summary && summary.running)
          }).length
        }
      } catch (error) {
        active = 0
      }
      const label = rows.length + ' 个子代理'
      return h('button', {
        type: 'button',
        className: 'dsh-sw-pill',
        title: '打开子代理工作台',
        onClick: event => {
          if (event.detail > 0) event.currentTarget.blur()
          openWorkbench(activeCtx)
        },
      },
        IconUsers(13),
        active > 0 ? h('span', { className: 'dsh-sw-pill-dot', 'aria-hidden': 'true' }) : null,
        h('span', null, label)
      )
    }

    function UtilityButton() {
      return h('button', {
        type: 'button',
        className: 'dsh-sw-utility',
        title: '打开子代理侧边栏',
        'aria-label': '打开子代理侧边栏',
        onClick: event => {
          if (event.detail > 0) event.currentTarget.blur()
          openWorkbench(activeCtx)
        },
      }, IconFork(15))
    }

    function Workbench(props) {
      const ctx = activeCtx
      const sessionId = props && props.sessionId
      const stats = (() => {
        try { return props.useProjection('sessionStats') } catch (error) { return undefined }
      })()
      const turns = stats && Number.isFinite(stats.turns) ? stats.turns : undefined
      const [task, setTask] = React.useState('')
      const [mode, setMode] = React.useState('fork')
      const [detached, setDetached] = React.useState(true)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [refreshing, setRefreshing] = React.useState(false)
      const [view, setView] = React.useState('spawn')
      const [selected, setSelected] = React.useState(() => new Set())
      const [selectedSource, setSelectedSource] = React.useState('')
      const [importMode, setImportMode] = React.useState('full')
      const [importTarget, setImportTarget] = React.useState('')
      const [importBusy, setImportBusy] = React.useState(false)
      const [importNote, setImportNote] = React.useState('')
      const [importError, setImportError] = React.useState('')
      const [showBranchView, setShowBranchView] = React.useState(false)
      const [openPicker, setOpenPicker] = React.useState('')
      const [selectedFork, setSelectedFork] = React.useState(null)
      const [commitLimit, setCommitLimit] = React.useState(8)
      const [laneLimit, setLaneLimit] = React.useState(8)
      const branchListRef = React.useRef(null)
      const taskRef = React.useRef(null)

      const catalog = (() => {
        try { return props.useProjection('subagentCatalog') } catch (error) { return undefined }
      })()
      let sessionState
      try { sessionState = props.useSessions(state => state) } catch (error) { sessionState = undefined }
      const summaryById = sessionState && sessionState.byId
      const branchView = (() => {
        try { return props.useProjection('branchIndex') } catch (error) { return undefined }
      })()
      const projectedRows = (Array.isArray(catalog)
        ? catalog.map(entry => {
            const summary = summaryById && summaryById[entry.id]
            const isRunning = Boolean(summary && (
              summary.running === true || summary.status === 'running' || summary.activity === 'running'
            ))
            return {
              id: entry.id,
              parentId: sessionId,
              name: entry.name || entry.id,
              label: entry.label || '',
              mode: entry.mode,
              createdAt: entry.createdAt,
              activity: isRunning ? 'running' : 'inactive',
            }
          })
        : []).sort((left, right) => (Number(right.createdAt) || 0) - (Number(left.createdAt) || 0))
      const displayRows = projectedRows
      const loaded = Array.isArray(catalog)

      const branchSessions = []
      if (sessionId && branchView && Array.isArray(branchView.turns)) {
        branchSessions.push({
          id: sessionId,
          name: '主会话',
          label: '',
          activity: 'current',
          parentSession: undefined,
          delegationDepth: 0,
          inheritedEventCount: branchView.inheritedEventCount,
          turns: branchView.turns,
          rawTurns: branchView.turns,
        })
      }
      for (const row of projectedRows) {
        const summary = summaryById && summaryById[row.id]
        const view = summary && summary.projectionValues && summary.projectionValues.branchIndex
        const turns = view && Array.isArray(view.turns) ? view.turns : []
        branchSessions.push({
          id: row.id,
          name: row.name || row.id,
          label: row.label || '',
          activity: row.activity,
          parentSession: sessionId,
          delegationDepth: 1,
          inheritedEventCount: view ? view.inheritedEventCount : undefined,
          turns: turns.filter(turn => !turn.inherited),
          rawTurns: turns,
          branchData: Boolean(view && Array.isArray(view.turns)),
        })
      }

      React.useEffect(() => {
        if (taskRef.current) taskRef.current.focus()
      }, [])

      React.useEffect(() => {
        if (!showBranchView) return undefined
        const onKey = event => {
          if (event.key === 'Escape') setShowBranchView(false)
        }
        document.addEventListener('keydown', onKey)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
          document.removeEventListener('keydown', onKey)
          document.body.style.overflow = previousOverflow
        }
      }, [showBranchView])

      React.useEffect(() => {
        if (!openPicker) return undefined
        const close = () => setOpenPicker('')
        document.addEventListener('click', close)
        return () => document.removeEventListener('click', close)
      }, [openPicker])

      React.useEffect(() => {
        const update = () => {
          const modalHeight = Math.min(window.innerHeight * 0.86, 720)
          const available = Math.max(180, modalHeight - 160)
          setLaneLimit(Math.max(3, Math.min(30, Math.floor(available / 34))))
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
      }, [])

      const call = async (line) => {
        const remote = remoteOf(ctx)
        if (!remote || !remote.commands || typeof remote.commands.execute !== 'function') {
          throw new Error('Remote 通道不可用（ctx.remote.commands）')
        }
        if (!sessionId) throw new Error('没有选中会话')
        const execution = await remote.commands.execute(sessionId, line, [], new AbortController().signal)
        if (!execution) throw new Error('命令未注册：' + line.split(' ')[0])
        if (execution.result && execution.result.kind === 'error') throw new Error(execution.result.text)
        return execution.result && execution.result.kind === 'success' ? (execution.result.text || '') : ''
      }

      const refresh = async () => {
        if (!sessionId) return
        setRefreshing(true)
        try {
          const sessions = activeSessions || service(ctx, 'sessions')
          if (!sessions || typeof sessions.refreshProjections !== 'function') {
            throw new Error('会话服务不可用')
          }
          await sessions.refreshProjections(sessionId)
          setError('')
        } catch (caught) {
          setError(errorText(caught))
        } finally {
          setRefreshing(false)
        }
      }

      const start = async () => {
        const clean = task.trim()
        if (!clean || busy || !sessionId) return
        setBusy(true)
        setError('')
        try {
          await call('/' + mode + (detached ? ' --detach' : '') + ' -- ' + clean.replace(/\s+/gu, ' '))
          setTask('')
        } catch (caught) {
          setError(errorText(caught))
        } finally {
          setBusy(false)
        }
      }

      const stop = async (row) => {
        try {
          const remote = remoteOf(ctx)
          if (!remote || !remote.subagents || typeof remote.subagents.interruptByUser !== 'function') {
            throw new Error('停止通道不可用')
          }
          await remote.subagents.interruptByUser(row.id)
        } catch (caught) {
          setError(errorText(caught))
        }
      }

      const summarize = async (row) => {
        try {
          const remote = remoteOf(ctx)
          if (!remote || !remote.subagents || typeof remote.subagents.prompt !== 'function') {
            throw new Error('总结通道不可用')
          }
          const requestId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
            ? globalThis.crypto.randomUUID()
            : 'req-' + Date.now() + '-' + Math.random().toString(16).slice(2)
          const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
          await remote.subagents.prompt({
            requestId,
            childSessionId: row.id,
            delivery: 'queue',
            content: [{
              type: 'text',
              text: '请把这次任务的结果总结成一段（不超过 10 行），然后使用 send_message 发给 lead。不要做其他事，也不要修改文件。',
            }],
            clientTimeZone,
          }, new AbortController().signal)
          setError('')
        } catch (caught) {
          setError(errorText(caught))
        }
      }

      const open = (row) => {
        try {
          const right = rightOf(ctx)
          if (!right || typeof right.openResource !== 'function') throw new Error('右侧栏不可用')
          const parent = row.parentId || sessionId
          const address = 'dsh-resource://subagentchat/session/' + row.id
            + '?parent=' + parent + '&mode=' + (row.mode || 'continuable')
          right.openResource(address, { kind: 'subagentchat', replaceTab: false })
        } catch (caught) {
          setError(errorText(caught))
        }
      }

      const running = displayRows.filter(row => row && row.activity === 'running').length
      const modeLabel = (value) => ({
        continuable: '可续聊',
        'one-shot': '一次性',
        external: '外部',
        unknown: '未知',
      }[value] || String(value || '未知'))
      const ageLabel = (createdAt) => {
        if (!createdAt) return ''
        const minutes = Math.max(0, Math.round((Date.now() - createdAt) / 60000))
        if (minutes < 1) return '刚刚'
        if (minutes < 60) return minutes + ' 分钟前'
        return Math.round(minutes / 60) + ' 小时前'
      }

      const renderRow = (row) => h('div', {
        key: row.id,
        className: 'dsh-sw-item',
        'data-run': row.activity === 'running' ? '1' : '0',
        role: 'button',
        tabIndex: 0,
        title: '打开子代理会话',
        onClick: () => open(row),
        onKeyDown: event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open(row)
          }
        },
      },
        h('span', { className: 'dsh-sw-dot', 'data-run': row.activity === 'running' ? '1' : '0', 'aria-hidden': 'true' }),
        h('div', { className: 'dsh-sw-main' },
          h('div', { className: 'dsh-sw-nm', title: row.name || row.id }, row.name || row.id),
          h('div', { className: 'dsh-sw-desc', title: row.label || '' }, row.label || '（无描述）'),
          h('div', { className: 'dsh-sw-meta' },
            modeLabel(row.mode) + ' · ' + (row.activity === 'running' ? '运行中' : '已结束')
            + (ageLabel(row.createdAt) ? ' · ' + ageLabel(row.createdAt) : ''))
        ),
        h('div', { className: 'dsh-sw-actions', onClick: event => event.stopPropagation() },
          h('button', {
            type: 'button', className: 'dsh-sw-ghost',
            disabled: row.activity !== 'running',
            title: row.activity === 'running' ? '停止当前轮' : '当前没有在运行',
            onClick: event => { event.stopPropagation(); void stop(row) },
          }, IconStop(11), '停止'),
          row.mode === 'continuable' && row.activity !== 'running'
            ? h('button', {
                type: 'button', className: 'dsh-sw-ghost',
                title: '让子代理总结并发给 lead',
                onClick: event => { event.stopPropagation(); void summarize(row) },
              }, IconSpark(11), '总结')
            : null
        )
      )

      const runningRows = displayRows.filter(row => row && row.activity === 'running')
      const idleRows = displayRows.filter(row => row && row.activity !== 'running')
      const group = (title, items) => items.length === 0 ? null : h(React.Fragment, null,
        h('div', { className: 'dsh-sw-section' },
          h('span', { className: 'dsh-sw-section-title' }, title),
          h('span', { className: 'dsh-sw-section-count' }, String(items.length))
        ),
        h('div', { className: 'dsh-sw-list' }, items.map(renderRow))
      )

      const shortId = value => String(value || '').replace(/^session-/, '').slice(0, 8)

      const branchTargets = [
        { id: sessionId, name: '主会话' },
        ...branchSessions
          .filter(session => session.id !== sessionId)
          .map(session => ({ id: session.id, name: session.name || shortId(session.id) })),
      ]
      const effectiveSource = selectedSource || sessionId || branchSessions[0]?.id || ''
      const sourceSession = branchSessions.find(session => session.id === effectiveSource)
      const targetOptions = branchTargets.filter(target => target.id !== effectiveSource)
      const effectiveTarget = targetOptions.some(target => target.id === importTarget)
        ? importTarget
        : (targetOptions[0]?.id || '')
      const targetSession = branchSessions.find(session => session.id === effectiveTarget)
      const turnKey = turn => String(turn.user || '').trim()
        + '\u0000' + String(turn.assistant || '').trim()
      const targetKeys = new Set(
        ((targetSession && (targetSession.rawTurns || targetSession.turns)) || []).map(turnKey),
      )
      const visibleSourceTurns = ((sourceSession && sourceSession.turns) || [])
        .filter(turn => !targetKeys.has(turnKey(turn)))
        .slice()
        .sort((left, right) => right.turn - left.turn)

      const mainTurns = branchView && Array.isArray(branchView.turns) ? branchView.turns : []
      const forkMap = new Map()
      for (const session of branchSessions) {
        if (session.id === sessionId || session.branchData === false) continue
        const inherited = (session.rawTurns || []).filter(turn => turn.inherited)
        if (inherited.length === 0) continue
        const turn = inherited[inherited.length - 1].turn
        if (!forkMap.has(turn)) forkMap.set(turn, { turn, sessions: [] })
        forkMap.get(turn).sessions.push(session)
      }
      const forkGroups = [...forkMap.values()].sort((left, right) => left.turn - right.turn)
      const maxTurn = Math.max(1, ...mainTurns.map(turn => turn.turn), ...forkGroups.map(group => group.turn))
      const activeFork = selectedFork === null
        ? null
        : forkGroups.find(group => group.turn === selectedFork) || null
      const activeForkTask = (() => {
        if (!activeFork) return ''
        const turn = mainTurns.find(item => item.turn === activeFork.turn)
        const text = String((turn && turn.user) || '').replace(/\s+/gu, ' ').trim()
        return text.length > 90 ? text.slice(0, 90) + '…' : text
      })()

      const changeSource = value => {
        setSelectedSource(value)
        setSelected(new Set())
        setImportTarget('')
        setImportNote('')
        setImportError('')
      }

      const changeTarget = value => {
        setImportTarget(value)
        setSelected(new Set())
        setImportNote('')
        setImportError('')
      }

      React.useLayoutEffect(() => {
        const node = branchListRef.current
        if (!node) return undefined
        const update = () => {
          const height = node.clientHeight
          const next = Math.max(1, Math.floor((height + 5) / 51))
          setCommitLimit(prev => prev === next ? prev : next)
        }
        update()
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        if (observer) observer.observe(node)
        window.addEventListener('resize', update)
        return () => {
          if (observer) observer.disconnect()
          window.removeEventListener('resize', update)
        }
      }, [view, effectiveSource, effectiveTarget, visibleSourceTurns.length])

      const toggleTurn = (session, turn) => {
        const key = session.id + ':' + turn.turn
        const switching = selectedSource && selectedSource !== session.id
        setSelected(prev => {
          if (switching) return new Set([key])
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
        if (!selectedSource || switching) {
          setSelectedSource(session.id)
          setImportTarget('')
          setImportNote('')
          setImportError('')
        }
      }

      const importSelection = async () => {
        if (selected.size === 0 || importBusy) return
        if (!effectiveSource) {
          setImportError('请先选择导出的会话')
          return
        }
        const entries = [...selected].map(key => {
          const [source, turn] = key.split(':')
          return { source, turn: Number(turn) }
        })
        if (entries.some(entry => entry.source !== effectiveSource)) {
          setImportError('选择的提交不属于当前导出来源')
          return
        }
        const source = effectiveSource
        const turns = entries.map(entry => entry.turn).sort((left, right) => left - right)
        const target = effectiveTarget
        if (!target) {
          setImportError('没有可导入的目标会话')
          return
        }
        if (target === source) {
          setImportError('目标会话不能和来源相同')
          return
        }
        if (importMode === 'reference' && turns.length > 1) {
          setImportError('引用模式一次只能导入一个提交')
          return
        }
        setImportBusy(true)
        setImportError('')
        setImportNote('')
        try {
          const line = '/import-turns --source ' + source
            + ' --target ' + target
            + ' --turns ' + turns.join(',')
            + ' --mode ' + importMode
          const text = await call(line)
          setImportNote(text || '已导入，下次任务读取')
          setSelected(new Set())
        } catch (caught) {
          setImportError(errorText(caught))
        } finally {
          setImportBusy(false)
        }
      }

      const importModeCopy = {
        full: '完整：把选中提交的原文作为上下文追加，不唤醒目标会话。',
        digest: '凝练：只追加用户请求与助手结论的摘要，token 更省。',
        reference: '引用：只注入提交清单，目标需要时再读取；一次一个提交。',
      }

      const renderImportBar = () => h('div', { className: 'dsh-sw-importbar' },
        h('div', { className: 'dsh-sw-importrow' },
          h('span', { className: 'dsh-sw-importcount' },
            selected.size > 0 ? '已选 ' + selected.size + ' 个提交' : '未选择提交'),
          h('div', { className: 'dsh-sw-modegroup' },
            h('span', { className: 'dsh-sw-modelabel' }, '模式'),
            h('div', { className: 'dsh-sw-modes' },
              [['full', '完整'], ['digest', '凝练'], ['reference', '引用']].map(([value, label]) => h('button', {
                key: value,
                type: 'button',
                className: 'dsh-sw-modebtn',
                'data-on': importMode === value ? '1' : '0',
                onClick: () => setImportMode(value),
              }, label))
            )
          ),
          h('button', {
            type: 'button',
            className: 'dsh-sw-primary',
            disabled: importBusy || selected.size === 0 || !effectiveTarget,
            onClick: () => { void importSelection() },
          }, importBusy ? '导入中…' : '导入')
        ),
        importError ? h('div', { className: 'dsh-sw-error' }, importError) : null,
        importNote ? h('div', { className: 'dsh-sw-importnote' }, importNote) : null,
        h('div', { className: 'dsh-sw-modehint' }, importModeCopy[importMode])
      )

      const renderBranches = (viewOnly = false) => {
        return h('section', { className: 'dsh-sw-branchcard' },
          h('div', { className: 'dsh-sw-branchhead' },
            h('span', { className: 'dsh-sw-cardicon' }, IconFork(14)),
            h('span', { className: 'dsh-sw-cardtitle' }, '分支 / 提交'),
            h('span', { className: 'dsh-sw-branchhint' }, '只读 · 实时投影'),
            h('button', {
              type: 'button', className: 'dsh-sw-ghost',
              onClick: () => { void refresh() },
            }, IconRefresh(12), '刷新')
          ),
          h('div', { className: 'dsh-sw-branchlegend' }, '仅显示各自新增 turn；inherited 前缀不重复'),
          branchSessions.length === 0
            ? h('div', { className: 'dsh-sw-branchempty' },
                branchView === undefined ? '等待分支投影…' : '没有可展示的提交')
            : (() => {
                const laneWidth = 210
                const laneGap = 10
                const total = branchSessions.length * laneWidth
                  + Math.max(0, branchSessions.length - 1) * laneGap
                const forks = branchSessions.length > 1
                return h('div', {
                  className: 'dsh-sw-lanes',
                  style: {
                    paddingTop: forks ? '30px' : '0',
                    display: 'flex',
                    gap: laneGap + 'px',
                    alignItems: 'flex-start',
                    overflowX: 'auto',
                    minWidth: 0,
                    height: '100%',
                  },
                },
                  forks
                    ? h('svg', {
                        className: 'dsh-sw-forkmap',
                        width: total,
                        height: 30,
                        viewBox: '0 0 ' + total + ' 30',
                      }, branchSessions.slice(1).map((session, index) => {
                        const x = (index + 1) * (laneWidth + laneGap) + laneWidth / 2
                        return h(React.Fragment, { key: session.id },
                          h('path', {
                            d: 'M 89 2 C 89 18, ' + x + ' 18, ' + x + ' 30',
                            fill: 'none',
                            stroke: 'var(--dsw-alias-brand-primary,#4d6bfe)',
                            strokeOpacity: 0.45,
                            strokeWidth: 1.5,
                          }),
                          h('circle', {
                            cx: x, cy: 30, r: 2.5,
                            fill: 'var(--dsw-alias-brand-primary,#4d6bfe)',
                          })
                        )
                      }))
                    : null,
                  branchSessions.map(session => {
                    const allTurns = session.turns || []
                    const shownTurns = allTurns.slice(-laneLimit)
                    return h('div', {
                      key: session.id,
                      className: 'dsh-sw-lane',
                      'data-depth': session.delegationDepth ?? 0,
                      style: {
                        width: laneWidth, flex: '0 0 ' + laneWidth + 'px', minWidth: 0,
                        height: '100%', display: 'flex', flexDirection: 'column',
                      },
                    },
                      h('div', { className: 'dsh-sw-lanehead' },
                        h('span', { className: 'dsh-sw-lanedot', 'aria-hidden': 'true' }),
                        h('span', { className: 'dsh-sw-lanename', title: session.id }, session.name || shortId(session.id)),
                        session.parentSession
                          ? h('span', { className: 'dsh-sw-laneparent' }, '↳ ' + shortId(session.parentSession))
                          : null
                      ),
                      h('div', { className: 'dsh-sw-lanelabel', title: session.id },
                        session.label || shortId(session.id)),
                      h('div', { className: 'dsh-sw-lanemeta' },
                        session.activity === 'running' ? '运行中'
                          : session.activity === 'current' ? '当前会话' : '已结束'),
                      session.branchData === false
                        ? h('div', { className: 'dsh-sw-lanelabel' }, 'fork 数据未加载')
                        : null,
                      h('div', {
                        className: 'dsh-sw-lanebody',
                        style: { maxHeight: 'none', overflow: 'hidden', flex: 1, minHeight: 0 },
                      },
                        shownTurns.map(turn => {
                          const key = session.id + ':' + turn.turn
                          const isSelected = selected.has(key)
                          return h('div', {
                            key: turn.turn,
                            className: 'dsh-sw-node',
                            'data-inherited': turn.inherited ? '1' : '0',
                            'data-selected': isSelected ? '1' : '0',
                            role: 'button',
                            tabIndex: 0,
                            title: '选择这个提交用于导入',
                            onClick: () => toggleTurn(session, turn),
                            onKeyDown: event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                toggleTurn(session, turn)
                              }
                            },
                          },
                            h('span', { className: 'dsh-sw-nodecheck', 'aria-hidden': 'true' }, isSelected ? '✓' : ''),
                            h('span', { className: 'dsh-sw-nodedot', 'aria-hidden': 'true' }),
                            h('span', { className: 'dsh-sw-nodeno' }, 'T' + turn.turn),
                            h('span', { className: 'dsh-sw-nodebody', style: { minWidth: 0, flex: 1 } },
                              h('span', {
                                className: 'dsh-sw-nodeuser',
                                title: turn.user || '',
                                style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' },
                              }, turn.user || '（无用户文本）'),
                              h('span', {
                                className: 'dsh-sw-nodemeta',
                                style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                              },
                                String(turn.toolCalls || 0) + ' tool · ' + String(turn.tokens || 0) + ' tk')
                            )
                          )
                        })
                      )
                    )
                  })
                )
              })()
          ,
          viewOnly ? null : renderImportBar()
        )
      }

      const renderBranchOpsLegacy = () => h('section', { className: 'dsh-sw-branchcard' },
        h('div', { className: 'dsh-sw-branchhead' },
          h('span', { className: 'dsh-sw-cardicon' }, IconFork(14)),
          h('span', { className: 'dsh-sw-cardtitle' }, '分支操作'),
          h('button', {
            type: 'button', className: 'dsh-sw-viewbtn',
            title: '查看完整分支泳道',
            onClick: () => setShowBranchView(true),
          }, '视图')
        ),
        h('div', { className: 'dsh-sw-branchselects' },
          h('label', { className: 'dsh-sw-branchselect' },
            h('span', null, '导出自'),
            h('select', {
              value: effectiveSource,
              disabled: branchSessions.length === 0,
              onChange: event => changeSource(event.target.value),
            }, branchTargets.map(target => h('option', {
              key: target.id, value: target.id,
            }, target.name)))
          ),
          h('label', { className: 'dsh-sw-branchselect' },
            h('span', null, '导入到'),
            h('select', {
              value: effectiveTarget,
              disabled: targetOptions.length === 0,
              onChange: event => changeTarget(event.target.value),
            }, targetOptions.length === 0
              ? h('option', { value: '' }, '没有其他会话')
              : targetOptions.map(target => h('option', {
                  key: target.id, value: target.id,
                }, target.name)))
          )
        ),
        branchSessions.length === 0
          ? h('div', { className: 'dsh-sw-branchempty' },
              branchView === undefined ? '等待分支投影…' : '没有可展示的提交')
          : sourceSession && visibleSourceTurns.length > 0
            ? h('div', { className: 'dsh-sw-opslist', key: 'ops-' + effectiveSource + '-' + effectiveTarget, ref: branchListRef },
                h('div', { className: 'dsh-sw-turns' },
                  visibleSourceTurns.slice(0, commitLimit).map(turn => {
                    const key = sourceSession.id + ':' + turn.turn
                    const isSelected = selected.has(key)
                    return h('div', {
                      key: turn.turn,
                      className: 'dsh-sw-turn',
                      'data-inherited': turn.inherited ? '1' : '0',
                      'data-selected': isSelected ? '1' : '0',
                      role: 'button',
                      tabIndex: 0,
                      onClick: () => toggleTurn(sourceSession, turn),
                      onKeyDown: event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleTurn(sourceSession, turn)
                        }
                      },
                    },
                      h('span', { className: 'dsh-sw-nodecheck', 'aria-hidden': 'true' }, isSelected ? '✓' : ''),
                      h('span', { className: 'dsh-sw-turnno' }, 'T' + turn.turn),
                      h('span', { className: 'dsh-sw-turntext' },
                        h('span', { className: 'dsh-sw-turnuser' }, turn.user || '（无用户文本）')
                      ),
                      h('span', { className: 'dsh-sw-turntokens' }, String(turn.tokens || 0) + ' tk'),
                      turn.inherited ? h('span', { className: 'dsh-sw-tag' }, '继承') : null
                    )
                  })
                )
              )
            : h('div', { className: 'dsh-sw-branchempty' },
                sourceSession
                  ? (sourceSession.branchData === false
                      ? '该会话的 branch 数据未加载，暂时没有可导入的提交'
                      : '该目标已有这些对话，没有需要导入的新提交')
                  : '该会话没有可选择的提交'),
        renderImportBar()
      )

      const renderPicker = (kind, label, valueId, options, onPick, direction) => {
        const selectedOption = options.find(option => option.id === valueId)
        return h('div', { className: 'dsh-sw-pickerwrap' },
          h('button', {
            type: 'button',
            className: 'dsh-sw-pickerrow',
            onClick: event => {
              event.stopPropagation()
              setOpenPicker(prev => prev === kind ? '' : kind)
            },
          },
            h('span', { className: 'dsh-sw-pickerlabel' }, label),
            h('span', { className: 'dsh-sw-pickervalue' }, (selectedOption && selectedOption.name) || '未选择'),
            h('span', { className: 'dsh-sw-pickerchevron' }, IconChevron(12))
          ),
          openPicker === kind
            ? h('div', {
                className: 'dsh-sw-pickerpop' + (direction === 'up' ? ' dsh-sw-pickerpop-up' : ''),
              },
                options.length === 0
                  ? h('div', { className: 'dsh-sw-pickerempty' }, '没有其他会话')
                  : options.map(option => h('button', {
                      key: option.id,
                      type: 'button',
                      className: 'dsh-sw-pickeroption',
                      'data-selected': option.id === valueId ? '1' : '0',
                      onClick: event => {
                        event.stopPropagation()
                        onPick(option.id)
                        setOpenPicker('')
                      },
                    },
                      h('span', { className: 'dsh-sw-pickeroptionname' }, option.name),
                      option.id === valueId
                        ? h('span', { className: 'dsh-sw-pickercheck' }, '✓')
                        : null
                    ))
              )
            : null
        )
      }

      const renderBranchOps = () => h('section', { className: 'dsh-sw-branchcard' },
        h('div', { className: 'dsh-sw-branchhead' },
          h('span', { className: 'dsh-sw-cardicon' }, IconFork(14)),
          h('span', { className: 'dsh-sw-cardtitle' }, '分支操作'),
          h('button', {
            type: 'button', className: 'dsh-sw-viewbtn',
            title: '查看完整分支泳道',
            onClick: () => setShowBranchView(true),
          }, '视图')
        ),
        h('div', { className: 'dsh-sw-pickercard', onClick: event => event.stopPropagation() },
          renderPicker('source', '导出自', effectiveSource, branchTargets, changeSource, 'down'),
          renderPicker('target', '导入到', effectiveTarget, targetOptions, changeTarget, 'down')
        ),
        h('div', { className: 'dsh-sw-listtitle' },
          h('span', null, '选择提交'),
          h('span', { className: 'dsh-sw-listcount' },
            selected.size > 0
              ? '已选 ' + selected.size + ' 个'
              : targetSession
                ? (targetSession.branchData === false
                    ? '目标数据未加载'
                    : '目标已有 ' + targetKeys.size + ' 条')
                : '未选择')
        ),
        branchSessions.length === 0
          ? h('div', { className: 'dsh-sw-branchempty' },
              branchView === undefined ? '等待分支投影…' : '没有可展示的提交')
          : sourceSession && visibleSourceTurns.length > 0
            ? h('div', { className: 'dsh-sw-opslist', key: 'ops-' + effectiveSource + '-' + effectiveTarget, ref: branchListRef },
                h('div', { className: 'dsh-sw-turns' },
                  visibleSourceTurns.slice(0, commitLimit).map(turn => {
                    const key = sourceSession.id + ':' + turn.turn
                    const isSelected = selected.has(key)
                    return h('div', {
                      key: turn.turn,
                      className: 'dsh-sw-turn',
                      'data-inherited': turn.inherited ? '1' : '0',
                      'data-selected': isSelected ? '1' : '0',
                      role: 'button',
                      tabIndex: 0,
                      onClick: () => toggleTurn(sourceSession, turn),
                      onKeyDown: event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleTurn(sourceSession, turn)
                        }
                      },
                    },
                      h('span', { className: 'dsh-sw-nodecheck', 'aria-hidden': 'true' }, isSelected ? '✓' : ''),
                      h('span', { className: 'dsh-sw-turnno' }, 'T' + turn.turn),
                      h('span', { className: 'dsh-sw-turntext' },
                        h('span', { className: 'dsh-sw-turnuser' }, turn.user || '（无用户文本）')
                      ),
                      h('span', { className: 'dsh-sw-turntokens' }, String(turn.tokens || 0) + ' tk'),
                      turn.inherited ? h('span', { className: 'dsh-sw-tag' }, '继承') : null
                    )
                  })
                )
              )
            : h('div', { className: 'dsh-sw-branchempty' },
                sourceSession
                  ? (sourceSession.branchData === false
                      ? '该会话的 branch 数据未加载，暂时没有可导入的提交'
                      : '该目标已有这些对话，没有需要导入的新提交')
                  : '该会话没有可选择的提交'),
        h('div', { className: 'dsh-sw-moderow' },
          h('span', { className: 'dsh-sw-modelabel' }, '模式'),
          h('div', { className: 'dsh-sw-modes' },
            [['full', '完整'], ['digest', '凝练'], ['reference', '引用']].map(([value, label]) => h('button', {
              key: value,
              type: 'button',
              className: 'dsh-sw-modebtn',
              'data-on': importMode === value ? '1' : '0',
              onClick: () => setImportMode(value),
            }, label))
          )
        ),
        h('div', { className: 'dsh-sw-modehint' }, importModeCopy[importMode]),
        importError ? h('div', { className: 'dsh-sw-error' }, importError) : null,
        importNote ? h('div', { className: 'dsh-sw-importnote' }, importNote) : null,
        h('button', {
          type: 'button',
          className: 'dsh-sw-primary dsh-sw-importbtn',
          disabled: importBusy || selected.size === 0 || !effectiveTarget,
          onClick: () => { void importSelection() },
        }, importBusy
          ? '导入中…'
          : selected.size > 0 ? '导入 ' + selected.size + ' 条对话记录' : '导入')
      )

      const renderForkTimeline = () => {
        const percent = turn => maxTurn <= 1 ? 0 : ((turn - 1) / (maxTurn - 1)) * 100
        return h('div', { className: 'dsh-sw-forkview' },
          h('div', { className: 'dsh-sw-forkmain' },
            h('span', { className: 'dsh-sw-forkmaindot' }),
            h('div', { className: 'dsh-sw-forkmainbody' },
              h('span', { className: 'dsh-sw-forkmaintitle' }, '主会话'),
              h('span', { className: 'dsh-sw-forkmainmeta' },
                shortId(sessionId) + ' · ' + mainTurns.length + ' 轮 · 当前 T' + maxTurn)
            ),
            h('span', { className: 'dsh-sw-forkmainbadge' }, forkGroups.length + ' 个 fork')
          ),
          h('div', { className: 'dsh-sw-forkbar' },
            h('div', { className: 'dsh-sw-forktrack' },
              h('div', { className: 'dsh-sw-forkfill' }),
              mainTurns.map(turn => h('span', {
                key: 'tick-' + turn.turn,
                className: 'dsh-sw-forktick',
                style: { left: percent(turn.turn) + '%' },
              })),
              forkGroups.map(group => h('button', {
                key: 'fork-' + group.turn,
                type: 'button',
                className: 'dsh-sw-forknode',
                'data-on': activeFork && activeFork.turn === group.turn ? '1' : '0',
                style: { left: percent(group.turn) + '%' },
                title: '查看 T' + group.turn + ' 的 fork',
                onClick: () => setSelectedFork(group.turn),
              },
                h('span', { className: 'dsh-sw-forknodelabel' }, 'T' + group.turn),
                group.sessions.length > 1
                  ? h('span', { className: 'dsh-sw-forknodecount' }, group.sessions.length)
                  : null
              ))
            ),
            h('div', { className: 'dsh-sw-forkaxis' },
              h('span', null, 'T1'),
              h('span', null, 'T' + Math.max(1, Math.round(maxTurn / 2))),
              h('span', null, 'T' + maxTurn)
            )
          ),
          activeFork
            ? h('div', { className: 'dsh-sw-forkdetail' },
                h('div', { className: 'dsh-sw-forktask' },
                  h('span', { className: 'dsh-sw-forktasklabel' }, 'T' + activeFork.turn + ' 任务'),
                  h('span', { className: 'dsh-sw-forktasktext' },
                    activeForkTask || '（该 turn 没有用户文本）')
                ),
                h('div', { className: 'dsh-sw-forkrows' },
                  activeFork.sessions.map(session => h('div', {
                    key: session.id, className: 'dsh-sw-forkrow',
                    role: 'button',
                    tabIndex: 0,
                    title: '打开这个子代理会话',
                    onClick: () => {
                      open({ id: session.id, parentId: sessionId, mode: 'continuable' })
                      setShowBranchView(false)
                    },
                    onKeyDown: event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        open({ id: session.id, parentId: sessionId, mode: 'continuable' })
                        setShowBranchView(false)
                      }
                    },
                  },
                    h('span', { className: 'dsh-sw-forkrowdot' }),
                    h('span', { className: 'dsh-sw-forkrowname' }, session.name || shortId(session.id)),
                    h('span', { className: 'dsh-sw-forkrowstatus' },
                      session.activity === 'running' ? '运行中' : '已结束'),
                    h('span', { className: 'dsh-sw-forkrowmeta' },
                      'inherited ' + (session.inheritedEventCount || 0)
                      + ' · own ' + (session.turns || []).length),
                    h('span', { className: 'dsh-sw-forkrowlink' }, '查看')
                  ))
                )
              )
            : h('div', { className: 'dsh-sw-forkhint' },
                forkGroups.length > 0
                  ? '点击进度条上的 fork 节点，查看该 turn 派生的会话'
                  : '还没有可定位的 fork 数据')
        )
      }

      const buildBranchOverlay = () => h('div', {
        className: 'dsh-sw-modalbackdrop',
        onClick: () => setShowBranchView(false),
      },
        h('div', {
          className: 'dsh-sw-modal dsh-sw-forkmodal',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': '分支视图',
          onClick: event => event.stopPropagation(),
        },
          h('div', { className: 'dsh-sw-modalhead' },
            h('span', { className: 'dsh-sw-modalicon' }, IconFork(15)),
            h('span', { className: 'dsh-sw-modaltitle' }, '分支视图'),
            h('span', { className: 'dsh-sw-modalhint' }, '主会话进度 · 点击 fork 节点查看对应会话'),
            h('button', {
              type: 'button', className: 'dsh-sw-modalclose',
              'aria-label': '关闭',
              onClick: () => setShowBranchView(false),
            }, '×')
          ),
          h('div', { className: 'dsh-sw-modalbody' }, renderForkTimeline())
        )
      )

      React.useEffect(() => {
        if (!showBranchView) {
          branchOverlayStore.set(null)
          return
        }
        branchOverlayStore.set(buildBranchOverlay())
      }, [
        showBranchView, branchSessions, selected, laneLimit, selectedFork, importMode, importTarget,
        effectiveTarget, importBusy, importNote, importError,
      ])

      React.useEffect(() => () => branchOverlayStore.set(null), [])

      return h('div', { className: 'dsh-sw' },
        (displayRows.length > 0 || error)
          ? h('div', { className: 'dsh-sw-head' },
              h('div', { className: 'dsh-sw-headinner' },
                displayRows.length > 0
                  ? h('span', { className: 'dsh-sw-chip' }, running + ' 运行中 / ' + displayRows.length)
                  : null
              )
            )
          : null,
        h('div', { className: 'dsh-sw-tabs' },
          h('button', {
            type: 'button', className: 'dsh-sw-tab', 'data-on': view === 'spawn' ? '1' : '0',
            onClick: () => setView('spawn'),
          }, '派发'),
          h('button', {
            type: 'button', className: 'dsh-sw-tab', 'data-on': view === 'branches' ? '1' : '0',
            onClick: () => setView('branches'),
          }, '分支')
        ),
        h('div', { className: 'dsh-sw-body', style: { display: view === 'branches' ? 'none' : 'flex' } },
          h('section', { className: 'dsh-sw-card' },
            h('div', { className: 'dsh-sw-cardhead' },
              h('span', { className: 'dsh-sw-cardicon' }, IconSpark(14)),
              h('span', { className: 'dsh-sw-cardtitle' }, '派生子代理')
            ),
            h('div', { className: 'dsh-sw-cardgrid' },
              h('div', { className: 'dsh-sw-col-main' },
                h('textarea', {
                  ref: taskRef,
                  className: 'dsh-sw-textarea',
                  placeholder: '描述任务，例如：审查刚才的 diff，重点看并发安全',
                  value: task,
                  rows: 3,
                  onChange: event => setTask(event.target.value),
                  onKeyDown: event => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault()
                      void start()
                    }
                  },
                })
              ),
              h('div', { className: 'dsh-sw-col-side' },
                h('div', { className: 'dsh-sw-seg' },
                  h('button', {
                    type: 'button', className: 'dsh-sw-segbtn', 'data-on': mode === 'fork' ? '1' : '0',
                    onClick: () => setMode('fork'),
                  }, IconFork(12), '继承上下文'),
                  h('button', {
                    type: 'button', className: 'dsh-sw-segbtn', 'data-on': mode === 'spawn' ? '1' : '0',
                    onClick: () => setMode('spawn'),
                  }, IconSpark(12), '全新开始')
                ),
                h('div', { className: 'dsh-sw-hint' }, IconInfo(11),
                  h('span', null, mode === 'fork'
                    ? (turns !== undefined
                        ? '继承 ' + turns + ' 轮已完成对话 · 不含当前轮'
                        : '继承本会话已完成的轮次 · 不含当前轮')
                    : '不继承对话历史，适合独立任务')),
                h('label', { className: 'dsh-sw-switch' },
                  h('input', {
                    type: 'checkbox',
                    checked: !detached,
                    onChange: event => setDetached(!event.target.checked),
                  }),
                  h('span', { className: 'dsh-sw-switchtrack' }, h('i', null)),
                  h('span', { className: 'dsh-sw-switchlabel' },
                    detached ? '独立运行 · 不自动回报' : '完成后回报主会话')
                ),
                h('button', {
                  type: 'button', className: 'dsh-sw-primary dsh-sw-primarywide', title: '⌘↵ 后台运行',
                  disabled: busy || !task.trim() || !sessionId,
                  onClick: () => { void start() },
                }, IconPlus(12), busy ? '运行中…' : '开始运行')
              )
            ),
            error ? h('div', { className: 'dsh-sw-error' }, error) : null
          ),
          displayRows.length === 0
            ? h('div', { className: 'dsh-sw-empty' },
                h('span', { className: 'dsh-sw-emptyicon' }, IconFork(20)),
                h('div', { className: 'dsh-sw-emptytitle' },
                  sessionId ? (loaded ? '还没有子代理' : '加载中…') : '请先选择一个会话'),
                h('div', { className: 'dsh-sw-emptysub' },
                  sessionId
                    ? (loaded ? '派发一个，让它带着当前上下文并行干活' : '正在读取子代理列表')
                    : '选择会话后即可派发')
              )
            : h(React.Fragment, null, group('运行中', runningRows), group('已完成', idleRows)),
          running > 0
            ? h('div', { className: 'dsh-sw-cap' },
                h('div', { className: 'dsh-sw-cap-row' },
                  h('span', null, '并发'),
                  h('span', null, running + ' / 8')
                ),
                h('div', { className: 'dsh-sw-bar' },
                  h('i', { style: { width: Math.min(100, Math.round((running / 8) * 100)) + '%' } })
                )
              )
            : null
        ),
        view === 'branches'
          ? h('div', { className: 'dsh-sw-body dsh-sw-branchbody' }, renderBranchOps())
          : null
      )
    }

    function apply(ctx) {
      activeCtx = ctx
      ensureTabType(ctx)

      try {
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.plugin = 'dsh-subagent-workbench'
          style.textContent = CSS
          document.head.appendChild(style)
          return () => {
            try { style.remove() } catch (error) { /* already detached */ }
          }
        })
      } catch (error) {
        console.error('[subagent-workbench] style injection failed', error)
      }

      try {
        ctx.inject(['remote', 'remote.commands', 'remote.subagents'], (scope) => {
          activeRemote = scope.remote
        })
      } catch (error) {
        console.error('[subagent-workbench] remote namespace injection failed', error)
      }

      try {
        ctx.inject(['sidebarRight'], (scope) => {
          activeRight = scope.sidebarRight
        })
      } catch (error) {
        console.error('[subagent-workbench] sidebarRight injection failed', error)
      }

      try {
        ctx.inject(['layout'], (scope) => {
          activeLayout = scope.layout
        })
      } catch (error) {
        console.error('[subagent-workbench] layout injection failed', error)
      }

      try {
        ctx.inject(['sessions'], (scope) => {
          activeSessions = scope.sessions
        })
      } catch (error) {
        console.error('[subagent-workbench] sessions injection failed', error)
      }

      try {
        if (typeof ctx.inject === 'function') {
          ctx.inject(['sidebarRightTabs'], (scope) => {
            try { registerType(scope.sidebarRightTabs, ctx) } catch (error) {
              console.error('[subagent-workbench] scoped tab type registration failed', error)
            }
          })
        }
      } catch (error) {
        console.error('[subagent-workbench] sidebarRightTabs injection failed', error)
      }

      try {
        ctx.effect(() => {
          if (tabTypeReady) return
          const timer = setInterval(() => {
            if (ensureTabType(ctx)) clearInterval(timer)
          }, 500)
          return () => clearInterval(timer)
        })
      } catch (error) {
        console.error('[subagent-workbench] tab type retry setup failed', error)
      }

      const registerUI = (slots) => {
        try {
          slots.inject('conversation.session.header.utilities', () => {
            try {
              return slots.register({
                name: 'conversation.session.header.utilities',
                id: 'subagent-workbench-utility',
                order: 5,
                label: '子代理侧边栏',
              }, UtilityButton)
            } catch (error) {
              console.error('[subagent-workbench] utility registration failed', error)
              return () => {}
            }
          })
        } catch (error) {
          console.error('[subagent-workbench] utility slot injection failed', error)
        }

        try {
          slots.inject('conversation.session.header.actions', () => {
            try {
              return slots.register({
                name: 'conversation.session.header.actions',
                id: 'subagent-catalog',
                order: 10,
                priority: -1,
                label: '子代理',
              }, CatalogPill)
            } catch (error) {
              console.error('[subagent-workbench] catalog pill registration failed', error)
              return () => {}
            }
          })
        } catch (error) {
          console.error('[subagent-workbench] catalog slot injection failed', error)
        }

        try {
          slots.inject('conversation.session.header.actions', () => {
            try {
              return slots.register({
                name: 'conversation.session.header.actions',
                id: 'subagent-workbench-launch',
                order: 30,
                label: '子代理工作台',
              }, HeaderAction)
            } catch (error) {
              console.error('[subagent-workbench] header action registration failed', error)
              return () => {}
            }
          })
        } catch (error) {
          console.error('[subagent-workbench] header slot injection failed', error)
        }

        try {
          slots.inject('sidebar.right.pane.tab', () => {
            try {
              return slots.register({
                name: 'sidebar.right.pane.tab',
                key: 'subagent-workbench',
              }, Workbench)
            } catch (error) {
              console.error('[subagent-workbench] right sidebar body registration failed', error)
              return () => {}
            }
          })
        } catch (error) {
          console.error('[subagent-workbench] right sidebar slot injection failed', error)
        }

        try {
          slots.inject('shell.overlay', () => {
            try {
              return slots.register({
                name: 'shell.overlay',
                id: 'subagent-workbench-branch-view',
              }, BranchViewOverlay)
            } catch (error) {
              console.error('[subagent-workbench] branch overlay registration failed', error)
              return () => {}
            }
          })
        } catch (error) {
          console.error('[subagent-workbench] branch overlay slot injection failed', error)
        }
      }

      let uiRegistered = false
      const registerOnce = (slots) => {
        if (uiRegistered) return
        uiRegistered = true
        registerUI(slots)
      }

      try {
        if (typeof ctx.inject === 'function') {
          ctx.inject(['slots'], (scope) => {
            registerOnce(scope.slots)
          })
        } else {
          const slots = service(ctx, 'slots')
          if (slots) registerOnce(slots)
          else console.error('[subagent-workbench] slots unavailable')
        }
      } catch (error) {
        console.error('[subagent-workbench] slots injection failed', error)
      }

      try {
        ctx.effect(() => {
          let tries = 0
          const timer = setInterval(() => {
            if (uiRegistered) { clearInterval(timer); return }
            tries += 1
            const slots = service(ctx, 'slots')
            if (slots) {
              clearInterval(timer)
              registerOnce(slots)
            } else if (tries >= 100) {
              clearInterval(timer)
            }
          }, 250)
          return () => clearInterval(timer)
        })
      } catch (error) {
        console.error('[subagent-workbench] slots retry setup failed', error)
      }

      if (AUTO_OPEN_ONCE) {
        try {
          ctx.effect(() => {
            const timer = setTimeout(() => {
              try {
                const key = 'dsh-subagent-workbench:auto-open:v16'
                if (window.sessionStorage.getItem(key) === '1') return
                window.sessionStorage.setItem(key, '1')
                openWorkbench(ctx)
              } catch (error) {
                console.error('[subagent-workbench] auto open failed', error)
              }
            }, 1500)
            return () => clearTimeout(timer)
          })
        } catch (error) {
          console.error('[subagent-workbench] auto open setup failed', error)
        }
      }
    }

    return { apply }
  },
})
