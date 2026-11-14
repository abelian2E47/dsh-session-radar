/**
 * Session Radar visual system.
 *
 * Operate-mode rules: a data-dense card matrix, restrained state colour,
 * native product type, one authored motion (the live radar sweep), and full
 * light/dark token support. The floating dock keeps its compact rows.
 */
export const RADAR_CSS = [
  ".dsr-dock, .dsr-dock *, .dsr-page, .dsr-page *, .dsr-rail, .dsr-rail * { box-sizing: border-box; } .dsr-dock, .dsr-page, .dsr-rail { font-family: var(--dsw-font-family); }",
  ":root, body { --dsr-accent: var(--dsw-alias-brand-primary); --dsr-green: var(--dsw-alias-state-success-primary); --dsr-amber: var(--dsw-alias-state-warn-primary); --dsr-red: var(--dsw-alias-state-error-primary); --dsr-line: var(--dsw-alias-border-l2); --dsr-line-soft: var(--dsw-alias-border-l1); --dsr-bg: var(--dsw-alias-bg-layer-1); --dsr-soft: var(--dsw-alias-bg-layer-2); --dsr-text: var(--dsw-alias-label-primary); --dsr-secondary: var(--dsw-alias-label-secondary); --dsr-muted: var(--dsw-alias-label-tertiary); --dsr-focus: var(--dsw-focus-ring-color); }",
  ".dsr-rail { position: fixed; right: 8px; top: 92px; z-index: 57; transform: none; display: flex; flex-direction: column; align-items: center; gap: 7px; width: 42px; padding: 10px 0 8px; border: 1px solid var(--dsr-line); border-radius: 21px; background: var(--dsr-bg); color: var(--dsr-secondary); box-shadow: var(--dsw-shadow-lv2); cursor: grab; touch-action: none; user-select: none; transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease, transform 160ms ease; } .dsr-rail.is-dragging { cursor: grabbing; transition: none; }",
  ".dsr-rail:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 36%, var(--dsr-line)); transform: translateX(-2px); }",
  ".dsr-rail:active { transform: translateX(0); }",
  ".dsr-rail__glyph { width: 24px; height: 24px; display: grid; place-items: center; }",
  ".dsr-rail__count { min-width: 20px; height: 18px; padding: 0 5px; border-radius: 9px; display: grid; place-items: center; background: var(--dsr-soft); color: var(--dsr-text); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; }",
  ".dsr-rail__count.has-work { background: var(--dsr-accent); color: var(--dsw-alias-label-primary-inverted); }",
  ".dsr-rail__label { writing-mode: vertical-rl; text-orientation: upright; letter-spacing: 2px; font: var(--dsw-font-xxxs-strong-11); color: currentColor; }",
  ".dsr-rail__unread { position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; border: 1.5px solid var(--dsr-bg); border-radius: 50%; background: var(--dsr-green); box-sizing: content-box; box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); }",
  ".dsr-scrim { position: fixed; inset: 0; z-index: 58; background: var(--dsw-alias-bg-mask-1); animation: dsr-fade 150ms ease-out; }",
  ".dsr-dock { position: fixed; z-index: 59; top: max(64px, calc(var(--dsh-frame-top-clearance, 0px) + 48px)); right: 14px; bottom: 14px; width: min(430px, calc(100vw - 28px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dsr-line); border-radius: 26px; background: var(--dsr-bg); color: var(--dsr-text); box-shadow: var(--dsw-shadow-lv3); animation: dsr-slide-in 200ms cubic-bezier(.2,.8,.2,1); }",
  ".dsr-dock__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 14px 11px 16px; }",
  ".dsr-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }",
  ".dsr-brand__mark { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 50%; background: transparent; color: var(--dsr-accent); flex: none; }",
  ".dsr-brand__copy { min-width: 0; }",
  ".dsr-brand__title { margin: 0; font: var(--dsw-font-s-strong-14); letter-spacing: -.01em; }",
  ".dsr-brand__sub { margin: 2px 0 0; font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-header-actions { display: flex; align-items: center; gap: 2px; flex: none; }",
  ".dsr-icon-btn { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 7px; display: grid; place-items: center; background: transparent; color: var(--dsr-secondary); cursor: pointer; transition: background-color 140ms ease, color 140ms ease; }",
  ".dsr-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }",
  ".dsr-icon-btn:active { background: var(--dsw-alias-interactive-bg-active); }",
  ".dsr-icon-btn.is-active { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); }",
  ".dsr-icon-btn.is-danger:hover { color: var(--dsr-red); background: color-mix(in srgb, var(--dsr-red) 10%, transparent); }",
  ".dsr-icon-btn:disabled { opacity: .4; cursor: default; }",
  ".dsr-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line); }",
  ".dsr-stat { min-width: 0; padding: 8px 12px 9px; border-right: 1px solid var(--dsr-line-soft); background: transparent; text-align: left; }",
  ".dsr-stat:last-child { border-right: 0; }",
  ".dsr-stat--button { cursor: pointer; }",
  ".dsr-stat--button:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-stat__value { display: block; font: var(--dsw-font-s-strong-14); font-variant-numeric: tabular-nums; line-height: 18px; }",
  ".dsr-stat__label { display: block; margin-top: 1px; font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-tabs { display: flex; align-items: center; gap: 18px; padding: 0 16px; border-bottom: 1px solid var(--dsr-line); flex: none; }",
  ".dsr-tab { position: relative; height: 35px; padding: 0; border: 0; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xs-13); cursor: pointer; }",
  ".dsr-page__views .dsr-tab:hover { color: var(--dsr-text); }",
  ".dsr-page__views .dsr-tab.is-active { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-tab.is-active::after { content: \"\"; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: var(--dsr-accent); }",
  ".dsr-tab__count { margin-left: 4px; color: var(--dsr-muted); font-variant-numeric: tabular-nums; font-weight: 400; }",
  ".dsr-searchrow { display: flex; align-items: center; gap: 6px; padding: 10px 12px 8px; flex: none; }",
  ".dsr-search { min-width: 0; flex: 1; display: flex; align-items: center; gap: 6px; height: 31px; padding: 0 9px; border: 1px solid transparent; border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-muted); transition: border-color 140ms ease, background-color 140ms ease; }",
  ".dsr-search:focus-within { border-color: var(--dsr-focus); background: var(--dsr-bg); }",
  ".dsr-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--dsr-text); font: var(--dsw-font-xs-13); }",
  ".dsr-search input::placeholder { color: var(--dsr-muted); }",
  ".dsr-search input { caret-color: var(--dsr-accent); }",
  ".dsr-dock ::selection, .dsr-page ::selection { background: color-mix(in srgb, var(--dsr-accent) 22%, transparent); color: var(--dsr-text); }",
  ".dsr-search button { width: 18px; height: 18px; padding: 0; border: 0; background: transparent; color: var(--dsr-muted); display: grid; place-items: center; cursor: pointer; }",
  ".dsr-search button:hover { color: var(--dsr-text); }",
  ".dsr-scroll { min-height: 0; flex: 1; overflow: auto; overscroll-behavior: contain; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-scroll::-webkit-scrollbar { width: 8px; height: 8px; }",
  ".dsr-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }",
  ".dsr-scroll::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l2); background-clip: padding-box; }",
  ".dsr-section { border-bottom: 1px solid var(--dsr-line); }",
  ".dsr-section:last-child { border-bottom: 0; }",
  ".dsr-section__head { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px 7px; }",
  ".dsr-section__title { margin: 0; font: var(--dsw-font-xxxs-strong-11); letter-spacing: .06em; color: var(--dsr-muted); }",
  ".dsr-section__count { font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); font-variant-numeric: tabular-nums; }",
  ".dsr-session-row { position: relative; display: flex; align-items: stretch; border-top: 1px solid var(--dsr-line-soft); transition: background-color 140ms ease; }",
  ".dsr-session-row:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-session-row.is-selected { background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-bg)); }",
  ".dsr-row-main { min-width: 0; flex: 1; display: flex; gap: 9px; padding: 11px 8px 10px 15px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-dot { width: 7px; height: 7px; margin-top: 6px; flex: none; border-radius: 50%; background: var(--dsr-muted); box-shadow: 0 0 0 3px transparent; }",
  ".dsr-session-row[data-tone=\"running\"] .dsr-dot, .dsr-session-row[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 14%, transparent); animation: dsr-pulse 2s ease-out infinite; }",
  ".dsr-session-row[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 14%, transparent); }",
  ".dsr-session-row[data-tone=\"approval\"] .dsr-dot, .dsr-session-row[data-tone=\"question\"] .dsr-dot { background: var(--dsr-amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-amber) 14%, transparent); }",
  ".dsr-session-row[data-tone=\"done\"] .dsr-dot { background: var(--dsr-green); }",
  ".dsr-session-row[data-tone=\"migration\"] .dsr-dot { background: var(--dsr-amber); }",
  ".dsr-row-body { min-width: 0; flex: 1; }",
  ".dsr-row-top { display: flex; align-items: center; gap: 7px; min-width: 0; }",
  ".dsr-row-title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-row-top .dsr-badge { flex: none; }",
  ".dsr-row-meta { display: flex; align-items: center; gap: 5px; min-width: 0; margin-top: 2px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; overflow: hidden; }",
  ".dsr-row-meta span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-row-meta .sep { color: var(--dsr-line); flex: none; }",
  ".dsr-row-live { display: flex; align-items: center; gap: 5px; min-width: 0; margin-top: 7px; font: var(--dsw-font-xxs-12); color: var(--dsr-secondary); }",
  ".dsr-row-live .dsr-tool-glyph { color: var(--dsr-accent); }",
  ".dsr-live-label { flex: none; font-weight: 550; color: var(--dsr-text); }",
  ".dsr-live-detail { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-secondary); }",
  ".dsr-live-elapsed { flex: none; margin-left: auto; color: var(--dsr-muted); font-variant-numeric: tabular-nums; font: var(--dsw-font-xxxs-11); }",
  ".dsr-row-bottom { display: flex; align-items: center; gap: 9px; margin-top: 7px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-metric { display: inline-flex; align-items: center; gap: 3px; }",
  ".dsr-metric strong { font-weight: 600; color: var(--dsr-secondary); }",
  ".dsr-metric .dsr-mini-bar { width: 34px; height: 3px; border-radius: 2px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-mini-bar > i { display: block; height: 100%; background: var(--dsr-accent); border-radius: 2px; }",
  ".dsr-progress { height: 2px; margin-top: 8px; border-radius: 2px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-progress__fill { height: 100%; border-radius: 2px; background: var(--dsr-accent); transition: width 300ms ease; }",
  ".dsr-progress.is-busy .dsr-progress__fill { width: 34%; animation: dsr-indeterminate 1.5s ease-in-out infinite; }",
  ".dsr-row-actions { display: flex; align-items: flex-start; gap: 1px; padding: 8px 7px 0 0; }",
  ".dsr-row-actions .dsr-icon-btn { width: 25px; height: 25px; }",
  ".dsr-row-actions .dsr-icon-btn[aria-pressed=\"true\"] { color: var(--dsr-accent); }",
  ".dsr-session-row.is-compact .dsr-row-main { padding-top: 9px; padding-bottom: 8px; }",
  ".dsr-session-row.is-compact .dsr-row-live, .dsr-session-row.is-compact .dsr-progress { display: none; }",
  ".dsr-session-row.is-compact .dsr-row-bottom { margin-top: 3px; }",
  ".dsr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 30px 26px 28px; text-align: center; }",
  ".dsr-empty__icon { width: 34px; height: 34px; display: grid; place-items: center; color: var(--dsr-muted); border: 1px solid var(--dsr-line); border-radius: 11px; }",
  ".dsr-empty__title { margin: 3px 0 0; font: var(--dsw-font-s-strong-14); }",
  ".dsr-empty__text { max-width: 290px; margin: 0; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); line-height: 18px; }",
  ".dsr-empty__actions { display: flex; gap: 6px; margin-top: 4px; }",
  ".dsr-empty__actions .dsr-button { flex: 0 0 auto; }",
  ".dsr-banner { display: flex; align-items: flex-start; gap: 7px; margin: 8px 12px 0; padding: 8px 9px; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 16px; }",
  ".dsr-banner svg { flex: none; margin-top: 1px; color: var(--dsr-amber); }",
  ".dsr-banner.is-error svg { color: var(--dsr-red); }",
  ".dsr-banner__action { margin-left: auto; padding: 0; border: 0; background: transparent; color: var(--dsr-accent); font: inherit; font-weight: 600; cursor: pointer; }",
  ".dsr-footer { display: flex; align-items: center; gap: 6px; padding: 7px 10px 8px; border-top: 1px solid var(--dsr-line); background: var(--dsr-bg); flex: none; }",
  ".dsr-footer__status { display: inline-flex; align-items: center; gap: 5px; min-width: 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-footer__status .dsr-dot { width: 5px; height: 5px; margin: 0; }",
  ".dsr-footer__status.is-live .dsr-dot { background: var(--dsr-green); }",
  ".dsr-footer__status.is-reconnecting .dsr-dot { background: var(--dsr-amber); animation: dsr-pulse 1.2s ease-out infinite; }",
  ".dsr-footer__sync { margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-footer .dsr-icon-btn { width: 25px; height: 25px; }",
  ".dsr-badge { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border: 1px solid var(--dsr-line); border-radius: 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); font-weight: 500; white-space: nowrap; }",
  ".dsr-badge.is-accent { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-badge.is-warn { color: var(--dsr-amber); border-color: color-mix(in srgb, var(--dsr-amber) 30%, var(--dsr-line)); }",
  ".dsr-badge.is-green { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 30%, var(--dsr-line)); }",
  ".dsr-tool-glyph { width: 14px; height: 14px; display: inline-grid; place-items: center; flex: none; }",
  ".dsr-detail { display: flex; flex-direction: column; min-height: 0; height: 100%; }",
  ".dsr-dock > .dsr-detail { flex: 1; height: auto; }",
  ".dsr-detail__head { display: flex; align-items: center; gap: 7px; padding: 9px 10px 8px 8px; border-bottom: 1px solid var(--dsr-line); flex: none; }",
  ".dsr-detail__headcopy { min-width: 0; flex: 1; }",
  ".dsr-detail__title { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-s-strong-14); }",
  ".dsr-detail__sub { display: flex; align-items: center; gap: 5px; margin-top: 2px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; overflow: hidden; }",
  ".dsr-detail__body { min-height: 0; flex: 1; overflow: auto; padding: 0 16px 24px; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-detail__body::-webkit-scrollbar { width: 8px; }",
  ".dsr-detail__body::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }",
  ".dsr-detail__section { padding: 15px 0; border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-detail__section:last-child { border-bottom: 0; }",
  ".dsr-detail__section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 9px; }",
  ".dsr-detail__section-title { margin: 0; font: var(--dsw-font-xxxs-strong-11); letter-spacing: .06em; color: var(--dsr-muted); }",
  ".dsr-detail__section-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-detail-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--dsr-line); border-radius: 9px; overflow: hidden; }",
  ".dsr-dstat { min-width: 0; padding: 9px 10px 10px; border-right: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-dstat:nth-child(3n) { border-right: 0; }",
  ".dsr-dstat:nth-child(n+4) { border-bottom: 0; }",
  "@media (max-width: 360px) { .dsr-detail-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-dstat:nth-child(3n) { border-right: 1px solid var(--dsr-line-soft); } .dsr-dstat:nth-child(2n) { border-right: 0; } .dsr-dstat:nth-child(n+4) { border-bottom: 1px solid var(--dsr-line-soft); } .dsr-dstat:nth-child(n+5) { border-bottom: 0; } }",
  ".dsr-dstat__label { display: block; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-dstat__value { display: flex; align-items: baseline; gap: 3px; margin-top: 3px; font: var(--dsw-font-s-strong-14); font-variant-numeric: tabular-nums; }",
  ".dsr-dstat__value small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-weight: 400; }",
  ".dsr-meter { height: 3px; margin-top: 6px; border-radius: 3px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-meter > i { display: block; height: 100%; border-radius: 3px; background: var(--dsr-accent); }",
  ".dsr-meter > i.is-warn { background: var(--dsr-amber); }",
  ".dsr-current { border: 1px solid var(--dsr-line); border-radius: 9px; background: var(--dsr-soft); padding: 10px 11px; }",
  ".dsr-current__row { display: flex; align-items: center; gap: 6px; min-width: 0; }",
  ".dsr-current__label { font: var(--dsw-font-xs-strong-13); }",
  ".dsr-current__detail { margin-top: 4px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 17px; overflow-wrap: anywhere; }",
  ".dsr-current__meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-pulse-line { display: flex; align-items: center; gap: 3px; }",
  ".dsr-pulse-line i { width: 3px; height: 3px; border-radius: 50%; background: var(--dsr-accent); animation: dsr-dot 1.2s ease-in-out infinite; }",
  ".dsr-pulse-line i:nth-child(2) { animation-delay: .15s; }",
  ".dsr-pulse-line i:nth-child(3) { animation-delay: .3s; }",
  ".dsr-plan { display: flex; flex-direction: column; gap: 0; }",
  ".dsr-plan__bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-plan__bar .dsr-meter { flex: 1; margin: 0; }",
  ".dsr-plan-item { display: flex; align-items: flex-start; gap: 7px; padding: 5px 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 17px; }",
  ".dsr-plan-item__mark { width: 14px; height: 14px; margin-top: 1px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 50%; color: transparent; }",
  ".dsr-plan-item.is-completed { color: var(--dsr-muted); text-decoration: line-through; text-decoration-color: var(--dsr-line); }",
  ".dsr-plan-item.is-completed .dsr-plan-item__mark { background: var(--dsr-green); border-color: var(--dsr-green); color: var(--dsw-alias-label-primary-inverted); }",
  ".dsr-plan-item.is-active { color: var(--dsr-text); font-weight: 550; }",
  ".dsr-plan-item.is-active .dsr-plan-item__mark { border-color: var(--dsr-accent); box-shadow: inset 0 0 0 3px var(--dsr-soft); background: var(--dsr-accent); }",
  ".dsr-timeline__item.is-done .dsr-timeline__dot { background: var(--dsr-green); }",
  ".dsr-timeline__item.is-running .dsr-timeline__dot { background: var(--dsr-accent); animation: dsr-pulse 1.6s ease-out infinite; }",
  ".dsr-timeline__item.is-error .dsr-timeline__dot { background: var(--dsr-red); }",
  ".dsr-file-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 0; border: 0; border-bottom: 1px solid var(--dsr-line-soft); background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-file-row:last-child { border-bottom: 0; }",
  ".dsr-file-row:hover .dsr-file-name { color: var(--dsr-accent); }",
  ".dsr-file-icon { width: 27px; height: 27px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 7px; background: var(--dsr-soft); color: var(--dsr-secondary); }",
  ".dsr-file-copy { min-width: 0; flex: 1; }",
  ".dsr-file-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-file-path { display: block; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-file-tag { flex: none; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-note { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 18px; overflow-wrap: anywhere; }",
  ".dsr-note.is-clamped { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }",
  ".dsr-detail__actions { display: flex; gap: 6px; align-items: center; padding: 10px 12px 12px; border-top: 1px solid var(--dsr-line); flex: none; background: var(--dsr-bg); }",
  ".dsr-button { height: 30px; padding: 0 12px; border: 1px solid var(--dsr-line); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); font-weight: 550; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }",
  ".dsr-button:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-button--primary { background: var(--dsw-alias-button-primary-fill); border-color: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-inverted); flex: 1; justify-content: center; }",
  ".dsr-button--primary:hover { background: var(--dsw-alias-button-primary-hover); }",
  ".dsr-button--danger { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 30%, var(--dsr-line)); }",
  ".dsr-button--danger:hover { background: color-mix(in srgb, var(--dsr-red) 9%, transparent); }",
  ".dsr-button--ghost { border-color: transparent; background: transparent; color: var(--dsr-secondary); }",
  ".dsr-button--ghost:hover { color: var(--dsr-text); }",
  ".dsr-button:disabled { opacity: .45; cursor: default; }",
  ".dsr-inline-form { display: flex; gap: 5px; align-items: center; width: 100%; }",
  ".dsr-inline-form input { min-width: 0; flex: 1; height: 30px; padding: 0 8px; border: 1px solid var(--dsr-focus); border-radius: 6px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); outline: 0; }",
  ".dsr-prefs { position: relative; }",
  ".dsr-prefs__menu { position: absolute; right: 0; top: 34px; bottom: auto; z-index: 4; width: 244px; padding: 6px; border: 1px solid var(--dsr-line); border-radius: 11px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv3); }",
  ".dsr-page .dsr-prefs__menu { top: 34px; bottom: auto; }",
  ".dsr-prefs__title { padding: 6px 8px 7px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .05em; }",
  ".dsr-toggle { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 8px; border-radius: 7px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); cursor: pointer; }",
  ".dsr-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }",
  ".dsr-toggle input { accent-color: var(--dsr-accent); width: 14px; height: 14px; margin: 0; }",
  ".dsr-prefs__note { margin: 5px 8px 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 15px; }",
  ".dsr-page { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsr-text); container-type: inline-size; container-name: dsr-page; }",
  ".dsr-page__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 24px 28px 16px; flex: none; }",
  ".dsr-page__heading { display: flex; align-items: center; gap: 12px; min-width: 0; }",
  ".dsr-page__mark { width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 11px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-page__title { margin: 0; font: var(--dsw-font-l-20); letter-spacing: -.02em; }",
  ".dsr-page__sub { margin: 3px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); }",
  ".dsr-page__toolbar { display: flex; align-items: center; gap: 6px; flex: none; }",
  ".dsr-page__toolbar .dsr-search { width: 230px; }",
  ".dsr-page__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line); padding: 0 28px; flex: none; }",
  ".dsr-page__stats .dsr-stat { padding: 10px 0; margin-right: 24px; border-right: 0; }",
  ".dsr-page__stats .dsr-stat:last-child { margin-right: 0; }",
  ".dsr-page__stats .dsr-stat__value { font-size: 17px; line-height: 21px; }",
  ".dsr-page__views { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 28px; border-bottom: 1px solid var(--dsr-line); flex: none; }",
  ".dsr-page__views .dsr-tabs { padding: 0; border-bottom: 0; gap: 22px; }",
  ".dsr-page__body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 370px); }",
  ".dsr-page__list { min-width: 0; min-height: 0; overflow: auto; border-right: 1px solid var(--dsr-line); scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-page__list::-webkit-scrollbar { width: 9px; }",
  ".dsr-page__list::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2); border-radius: 9px; border: 2px solid transparent; background-clip: padding-box; }",
  ".dsr-page__detail { min-width: 0; min-height: 0; background: var(--dsr-bg); }",
  ".dsr-page__view { padding-bottom: 24px; }",
  ".dsr-page__sectionhead { display: flex; align-items: baseline; justify-content: space-between; padding: 17px 20px 8px; }",
  ".dsr-page__sectionhead h2 { margin: 0; font: var(--dsw-font-xxs-strong-12); color: var(--dsr-secondary); }",
  ".dsr-page__sectionhead span { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-page__empty { padding: 34px 28px 26px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-page .dsr-session-row .dsr-row-main { padding-top: 13px; padding-bottom: 12px; padding-left: 20px; }",
  ".dsr-page .dsr-row-actions { padding-right: 18px; padding-top: 10px; }",
  ".dsr-page .dsr-row-live { margin-top: 8px; }",
  ".dsr-page .dsr-row-bottom { margin-top: 8px; }",
  ".dsr-table { width: 100%; }",
  ".dsr-table__head, .dsr-table__row { display: grid; grid-template-columns: minmax(0, 2.3fr) 110px 100px 70px; gap: 12px; align-items: center; padding: 0 20px; }",
  ".dsr-table__head { position: sticky; top: 0; z-index: 1; height: 30px; border-bottom: 1px solid var(--dsr-line); background: var(--dsw-alias-bg-base); color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); }",
  ".dsr-table__row { width: 100%; min-height: 48px; border: 0; border-bottom: 1px solid var(--dsr-line-soft); background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-table__row:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-table__session { min-width: 0; }",
  ".dsr-table__name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-table__meta { display: block; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-table__num { font: var(--dsw-font-xxs-12); font-variant-numeric: tabular-nums; color: var(--dsr-secondary); }",
  ".dsr-table__bar { height: 3px; margin-top: 4px; border-radius: 3px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-table__bar i { display: block; height: 100%; background: var(--dsr-accent); border-radius: 3px; }",
  ".dsr-searchpage { padding: 20px 20px 30px; }",
  ".dsr-searchpage__form { display: flex; align-items: center; gap: 7px; max-width: 640px; }",
  ".dsr-searchpage__form .dsr-search { height: 35px; }",
  ".dsr-searchpage__hint { margin: 8px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 16px; }",
  ".dsr-searchpage__form .dsr-button--primary { flex: 0 0 auto; }",
  ".dsr-result { display: block; width: 100%; padding: 10px 0; border: 0; border-bottom: 1px solid var(--dsr-line-soft); background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-result:hover .dsr-result__title { color: var(--dsr-accent); }",
  ".dsr-result__title { font: var(--dsw-font-xs-strong-13); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-result__snippet { margin-top: 2px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 17px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }",
  ".dsr-result__meta { margin-top: 3px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-skeleton { display: flex; flex-direction: column; gap: 10px; padding: 16px; }",
  ".dsr-skeleton__row { height: 44px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: linear-gradient(90deg, var(--dsr-soft), color-mix(in srgb, var(--dsr-soft) 60%, var(--dsr-line)), var(--dsr-soft)); background-size: 200% 100%; animation: dsr-shimmer 1.4s linear infinite; }",
  ".dsr-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }",
  ".dsr-button:focus-visible, .dsr-icon-btn:focus-visible, .dsr-tab:focus-visible, .dsr-rail:focus-visible, .dsr-session-row .dsr-row-main:focus-visible, .dsr-card__main:focus-visible, .dsr-workspace-card:focus-visible, .dsr-history-card__main:focus-visible, .dsr-check:focus-visible, .dsr-table__row:focus-visible, .dsr-file-row:focus-visible, .dsr-result:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 2px; }",
  "@keyframes dsr-slide-in { from { opacity: 0; transform: translateX(13px); } to { opacity: 1; transform: translateX(0); } }",
  "@keyframes dsr-fade { from { opacity: 0; } to { opacity: 1; } }",
  "@keyframes dsr-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 30%, transparent); } 70% { box-shadow: 0 0 0 5px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }",
  "@keyframes dsr-dot { 0%, 100% { opacity: .3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-1px); } }",
  "@keyframes dsr-sweep { to { transform: rotate(360deg); } }",
  "@keyframes dsr-indeterminate { 0% { transform: translateX(-110%); } 100% { transform: translateX(330%); } }",
  "@keyframes dsr-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }",
  ".dsr-radar { display: block; overflow: visible; }",
  ".dsr-radar__sweep { transform-origin: 8px 8px; transform: rotate(25deg); }",
  ".dsr-radar.is-active .dsr-radar__sweep { animation: dsr-sweep 4.2s linear infinite; }",
  ".dsr-scrim { background: transparent; animation: none; }",
  ".dsr-page { background: var(--dsw-alias-bg-base); }",
  ".dsr-page__head { align-items: center; padding: 25px 30px 14px; }",
  ".dsr-page__mark { width: 38px; height: 38px; border-radius: 12px; background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); }",
  ".dsr-page__title { font-size: 21px; line-height: 26px; letter-spacing: -.025em; }",
  ".dsr-page__sub { max-width: 46ch; }",
  ".dsr-page__toolbar { gap: 8px; }",
  ".dsr-page__stats { border-bottom-color: var(--dsr-line-soft); }",
  ".dsr-page__stats .dsr-stat { padding-top: 11px; padding-bottom: 11px; }",
  ".dsr-page__stats .dsr-stat__value { font-size: 18px; line-height: 22px; }",
  ".dsr-page__views { padding-top: 2px; }",
  ".dsr-page__body { grid-template-columns: minmax(0, 1fr); transition: grid-template-columns 180ms ease; }",
  ".dsr-page__body.has-selection { grid-template-columns: minmax(0, 1fr) minmax(340px, 390px); }",
  ".dsr-page__list { border-right: 0; }",
  ".dsr-page__detail { display: none; border-left: 1px solid var(--dsr-line); box-shadow: -10px 0 24px -24px rgba(0, 0, 0, .22); }",
  ".dsr-page__body.has-selection .dsr-page__detail { display: block; }",
  ".dsr-board { padding: 19px 26px 30px; }",
  ".dsr-board__section + .dsr-board__section { margin-top: 28px; }",
  ".dsr-board__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 11px; }",
  ".dsr-board__head h2 { margin: 0; font: var(--dsw-font-s-strong-14); font-size: 15px; letter-spacing: -.015em; }",
  ".dsr-board__head p { margin: 3px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-board__headmeta { display: flex; align-items: center; gap: 8px; flex: none; }",
  ".dsr-board__count { display: inline-flex; align-items: center; height: 23px; padding: 0 8px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; background: var(--dsr-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(282px, 1fr)); gap: 12px; align-items: stretch; }",
  ".dsr-card-grid--live { grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }",
  ".dsr-card { position: relative; min-width: 0; min-height: 246px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dsr-line); border-radius: 14px; background: var(--dsr-bg); box-shadow: 0 1px 2px rgba(0, 0, 0, .025), 0 14px 30px -30px rgba(0, 0, 0, .35); transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }",
  ".dsr-card::before { content: \"\"; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 100% 0, color-mix(in srgb, var(--dsr-accent) 8%, transparent), transparent 52%); opacity: .75; }",
  ".dsr-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line)); box-shadow: 0 14px 32px -20px rgba(0, 0, 0, .25); }",
  ".dsr-card.is-live { grid-column: span 2; border-color: color-mix(in srgb, var(--dsr-accent) 18%, var(--dsr-line)); }",
  ".dsr-card.is-live::before { background: radial-gradient(ellipse at 100% 0, color-mix(in srgb, var(--dsr-accent) 13%, transparent), transparent 50%), linear-gradient(115deg, transparent 62%, color-mix(in srgb, var(--dsr-accent) 3%, transparent)); }",
  ".dsr-card.is-compact { min-height: 220px; }",
  ".dsr-card.is-compact .dsr-card__main { padding-top: 6px; }",
  ".dsr-card.is-compact .dsr-card__footer { min-height: 34px; }",
  ".dsr-card__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 13px 13px 0 15px; }",
  ".dsr-card__statusline { display: flex; align-items: center; gap: 7px; min-width: 0; }",
  ".dsr-card__status { overflow: hidden; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card .dsr-dot { width: 7px; height: 7px; margin-top: 0; }",
  ".dsr-card[data-tone=\"running\"] .dsr-dot, .dsr-card[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 13%, transparent); animation: dsr-pulse 2s ease-out infinite; }",
  ".dsr-card[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 13%, transparent); }",
  ".dsr-card[data-tone=\"approval\"] .dsr-dot, .dsr-card[data-tone=\"question\"] .dsr-dot { background: var(--dsr-amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-amber) 13%, transparent); }",
  ".dsr-card[data-tone=\"done\"] .dsr-dot { background: var(--dsr-green); }",
  ".dsr-card[data-tone=\"migration\"] .dsr-dot { background: var(--dsr-amber); }",
  ".dsr-card__headactions { display: flex; gap: 1px; flex: none; }",
  ".dsr-card__main { position: relative; z-index: 1; flex: 1; width: 100%; min-width: 0; display: flex; flex-direction: column; padding: 8px 15px 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-card__title { margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font: var(--dsw-font-s-strong-14); line-height: 20px; letter-spacing: -.012em; }",
  ".dsr-card__meta { display: flex; align-items: center; gap: 5px; min-width: 0; margin: 4px 0 0; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-card__meta span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-card__meta .sep { flex: none; color: var(--dsr-line); }",
  ".dsr-card__live { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 31px; margin-top: 10px; padding: 6px 8px; border: 1px solid transparent; border-radius: 8px; background: color-mix(in srgb, var(--dsr-soft) 78%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); }",
  ".dsr-card.is-live .dsr-card__live { border-color: color-mix(in srgb, var(--dsr-accent) 12%, transparent); background: color-mix(in srgb, var(--dsr-accent) 7%, transparent); }",
  ".dsr-card__live .dsr-tool-glyph { flex: none; color: var(--dsr-accent); }",
  ".dsr-card__live-label { flex: none; color: var(--dsr-text); font-weight: 600; }",
  ".dsr-card__live-detail { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card__live-time { flex: none; margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-card__progress { margin-top: 8px; }",
  ".dsr-card__todo { display: block; margin-top: 5px; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card__times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 11px; padding-top: 9px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-card__time { display: flex; flex-direction: column; gap: 1px; min-width: 0; }",
  ".dsr-card__time-label { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-card__time-value { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-variant-numeric: tabular-nums; line-height: 18px; }",
  ".dsr-card__footer { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; min-height: 38px; margin-top: 10px; padding: 7px 13px 9px 15px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-card__metric { display: inline-flex; align-items: center; gap: 3px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-card__metric strong { color: var(--dsr-secondary); font-weight: 600; }",
  ".dsr-card__spacer { flex: 1; }",
  ".dsr-card__enter { display: inline-flex; align-items: center; gap: 3px; padding: 3px 0; border: 0; background: transparent; color: var(--dsr-accent); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; }",
  ".dsr-card__enter:hover { text-decoration: underline; text-underline-offset: 3px; }",
  ".dsr-card__enter:focus-visible, .dsr-workspace-card:focus-visible, .dsr-history-card__main:focus-visible, .dsr-check:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 2px; }",
  ".dsr-board__quiet, .dsr-board__hint { display: flex; align-items: center; gap: 9px; min-height: 54px; padding: 11px 13px; border: 1px dashed var(--dsr-line); border-radius: 11px; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); }",
  ".dsr-board__quiet .dsr-radar { color: var(--dsr-accent); flex: none; }",
  ".dsr-board__hint { margin-top: 14px; }",
  ".dsr-board__foot { margin-top: 22px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-workspace-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 10px; margin-top: 12px; }",
  ".dsr-workspace-card { position: relative; min-height: 154px; display: flex; flex-direction: column; align-items: stretch; padding: 14px; border: 1px solid var(--dsr-line); border-radius: 13px; background: var(--dsr-bg); color: inherit; text-align: left; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease; }",
  ".dsr-workspace-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line)); }",
  ".dsr-workspace-card.is-selected { border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 5%, var(--dsr-bg)); }",
  ".dsr-workspace-card__head { display: flex; align-items: center; gap: 8px; min-width: 0; }",
  ".dsr-workspace-card__icon { width: 26px; height: 26px; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-workspace-card__title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-workspace-card__arrow { color: var(--dsr-muted); flex: none; }",
  ".dsr-workspace-card__path { display: block; margin-top: 8px; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-workspace-card__meters { display: flex; align-items: center; gap: 9px; margin-top: 11px; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }",
  ".dsr-workspace-card__meters span { display: inline-flex; align-items: center; gap: 4px; }",
  ".dsr-workspace-card__meters .dsr-dot { width: 6px; height: 6px; margin-top: 0; background: var(--dsr-muted); }",
  ".dsr-workspace-card__meters .dsr-dot.is-on { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); }",
  ".dsr-workspace-card__dots { display: flex; align-items: center; gap: 3px; min-height: 12px; margin-top: auto; padding-top: 14px; }",
  ".dsr-workspace-card__dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--dsr-line); }",
  ".dsr-workspace-card__dots i[data-tone=\"running\"], .dsr-workspace-card__dots i[data-tone=\"tool\"] { background: var(--dsr-green); }",
  ".dsr-workspace-card__dots i[data-tone=\"tool\"] { background: var(--dsr-accent); }",
  ".dsr-workspace-card__dots i[data-tone=\"approval\"], .dsr-workspace-card__dots i[data-tone=\"question\"] { background: var(--dsr-amber); }",
  ".dsr-workspace-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-workspace-card__foot span:last-child { color: var(--dsr-accent); font-weight: 600; }",
  ".dsr-workspaces { display: flex; flex-direction: column; }",
  ".dsr-workspace-detail { order: -1; margin-top: 0; margin-bottom: 20px; padding-top: 0; border-top: 0; }",
  ".dsr-history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 9px; margin-top: 12px; }",
  ".dsr-history-card { display: flex; align-items: flex-start; gap: 8px; min-width: 0; padding: 11px 10px 10px; border: 1px solid var(--dsr-line-soft); border-radius: 11px; background: var(--dsr-bg); transition: border-color 150ms ease, background-color 150ms ease; }",
  ".dsr-history-card:hover { border-color: var(--dsr-line); background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-history-card.is-checked { border-color: color-mix(in srgb, var(--dsr-accent) 40%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 6%, var(--dsr-bg)); }",
  ".dsr-check { width: 18px; height: 18px; flex: none; display: grid; place-items: center; margin-top: 2px; padding: 0; border: 1px solid var(--dsr-line); border-radius: 5px; background: var(--dsr-bg); color: var(--dsw-alias-label-primary-inverted); cursor: pointer; }",
  ".dsr-check.is-checked { border-color: var(--dsr-accent); background: var(--dsr-accent); }",
  ".dsr-history-card__main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-history-card__title { overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-history-card__meta { overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-history-card__live { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-history-card__live span:last-child { overflow: hidden; text-overflow: ellipsis; color: var(--dsr-muted); }",
  ".dsr-history-card__times { display: flex; align-items: center; gap: 9px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-history-card__times strong { color: var(--dsr-secondary); font-weight: 600; }",
  ".dsr-archive-section { margin-top: 28px; }",
  ".dsr-bulkbar { position: sticky; bottom: 12px; z-index: 3; display: flex; align-items: center; gap: 9px; min-height: 42px; margin-top: 14px; padding: 8px 10px 8px 12px; border: 1px solid var(--dsr-line); border-radius: 11px; background: color-mix(in srgb, var(--dsr-bg) 92%, transparent); box-shadow: 0 10px 26px -20px rgba(0, 0, 0, .35); backdrop-filter: blur(12px); }",
  ".dsr-bulkbar.is-danger { border-color: color-mix(in srgb, var(--dsr-amber) 35%, var(--dsr-line)); }",
  ".dsr-bulkbar__count { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); white-space: nowrap; }",
  ".dsr-bulkbar__message { overflow: hidden; color: var(--dsr-green); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-bulkbar__error { overflow: hidden; color: var(--dsr-red); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-bulkbar__spacer { flex: 1; }",
  ".dsr-bulkbar__actions { display: flex; align-items: center; gap: 6px; flex: none; }",
  ".dsr-bulkbar__confirm { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; flex-wrap: wrap; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }",
  ".dsr-bulkbar__confirm strong { color: var(--dsr-amber); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-bulkbar__confirm .dsr-bulkbar__actions { margin-left: auto; }",
  ".dsr-button--danger { border-color: color-mix(in srgb, var(--dsr-red) 28%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-red) 9%, var(--dsr-bg)); color: var(--dsr-red); }",
  ".dsr-button--danger:hover { background: color-mix(in srgb, var(--dsr-red) 14%, var(--dsr-bg)); }",
  ".dsr-artifact-grid, .dsr-usage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; margin-top: 12px; }",
  ".dsr-artifact-card { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-height: 112px; padding: 13px; border: 1px solid var(--dsr-line-soft); border-radius: 11px; background: var(--dsr-bg); color: inherit; text-align: left; cursor: pointer; transition: border-color 150ms ease, transform 150ms ease; }",
  ".dsr-artifact-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line)); }",
  ".dsr-artifact-card__icon { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 7px; background: var(--dsr-soft); color: var(--dsr-accent); }",
  ".dsr-artifact-card__name { max-width: 100%; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-artifact-card__path { max-width: 100%; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-artifact-card__foot { display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 6px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-usage-card { display: flex; flex-direction: column; gap: 8px; min-height: 128px; padding: 13px; border: 1px solid var(--dsr-line-soft); border-radius: 11px; background: var(--dsr-bg); color: inherit; text-align: left; cursor: pointer; transition: border-color 150ms ease, transform 150ms ease; }",
  ".dsr-usage-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line)); }",
  ".dsr-usage-card__title { overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-usage-card__meta { overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-usage-card__big { color: var(--dsr-text); font: var(--dsw-font-l-20); font-size: 22px; line-height: 26px; font-variant-numeric: tabular-nums; letter-spacing: -.03em; }",
  ".dsr-usage-card__big small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); letter-spacing: 0; }",
  ".dsr-usage-card__bar { height: 4px; border-radius: 4px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-usage-card__bar i { display: block; height: 100%; border-radius: 4px; background: var(--dsr-accent); }",
  ".dsr-usage-card__foot { display: flex; gap: 9px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-usage-card__foot strong { color: var(--dsr-secondary); font-weight: 600; }",
  "@container dsr-page (max-width: 1120px) { .dsr-card.is-live { grid-column: auto; } .dsr-page__body.has-selection { grid-template-columns: minmax(0, 1fr) minmax(320px, 350px); } }",
  "@media (max-width: 980px) { .dsr-card.is-live { grid-column: auto; } .dsr-board { padding-left: 18px; padding-right: 18px; } .dsr-page__body.has-selection { grid-template-columns: minmax(0, 1fr); } .dsr-page__body.has-selection .dsr-page__detail { display: block; } }",
  "@media (max-width: 680px) { .dsr-page__head { padding: 18px 16px 12px; } .dsr-page__sub { max-width: none; } .dsr-board { padding: 16px 14px 24px; } .dsr-card-grid, .dsr-card-grid--live, .dsr-workspace-grid, .dsr-history-grid, .dsr-artifact-grid, .dsr-usage-grid { grid-template-columns: minmax(0, 1fr); } .dsr-card { min-height: 220px; } .dsr-board__head { align-items: flex-start; flex-direction: column; gap: 8px; } .dsr-bulkbar { flex-wrap: wrap; } .dsr-bulkbar__spacer { display: none; } .dsr-bulkbar__actions { margin-left: auto; } }",
  ".dsr-dock__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; border-top: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-dock__foottext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-detail__spacer { flex: 1; }",
  ".dsr-files { display: flex; flex-direction: column; gap: 2px; }",
  ".dsr-file-row__icon { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-file-row__name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-file-row__meta { min-width: 0; max-width: 46%; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-plan__mark { width: 18px; height: 18px; display: grid; place-items: center; color: var(--dsr-muted); flex: none; }",
  ".dsr-plan__item[data-status=\"completed\"] .dsr-plan__mark { color: var(--dsr-green); }",
  ".dsr-plan__item[data-status=\"in_progress\"] .dsr-plan__mark { color: var(--dsr-accent); }",
  ".dsr-plan__item[data-status=\"in_progress\"] .dsr-plan__text { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-output { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 19px; white-space: pre-wrap; }",
  ".dsr-search-results { display: flex; flex-direction: column; gap: 0; padding: 4px 14px 8px; border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-search-results__head { padding: 8px 0 5px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .05em; }",
  ".dsr-search-results--empty { padding: 14px; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); }",
  "@container dsr-page (max-width: 900px) { .dsr-page__body { grid-template-columns: minmax(0, 1fr); } .dsr-page__detail { display: none; border-top: 1px solid var(--dsr-line); } .dsr-page__body.has-selection .dsr-page__list { display: none; } .dsr-page__body.has-selection .dsr-page__detail { display: block; } .dsr-page__toolbar .dsr-search { width: 180px; } }",
  "@media (max-width: 980px) { .dsr-page__body { grid-template-columns: minmax(0, 1fr); } .dsr-page__detail { display: none; border-top: 1px solid var(--dsr-line); } .dsr-page__body.has-selection .dsr-page__list { display: none; } .dsr-page__body.has-selection .dsr-page__detail { display: block; } .dsr-page__toolbar .dsr-search { width: 180px; } }",
  "@media (max-width: 680px) { .dsr-dock { top: 56px; right: 8px; bottom: 8px; width: calc(100vw - 16px); border-radius: 22px; } .dsr-rail { top: auto; right: 14px; bottom: 18px; transform: none; flex-direction: row; width: auto; height: 42px; padding: 0 11px; border-radius: 21px; } .dsr-rail:hover { transform: translateY(-2px); } .dsr-rail__label { display: none; } .dsr-page__head { padding: 18px 16px 12px; gap: 10px; } .dsr-page__toolbar .dsr-search { display: none; } .dsr-page__stats { padding: 0 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-page__stats .dsr-stat { margin-right: 12px; } .dsr-page__views { padding: 0 16px; } .dsr-page__sectionhead { padding-left: 16px; padding-right: 16px; } .dsr-page .dsr-session-row .dsr-row-main { padding-left: 16px; } .dsr-page .dsr-row-actions { padding-right: 12px; } .dsr-table__head, .dsr-table__row { grid-template-columns: minmax(0, 1.7fr) 90px; } .dsr-table__head > :nth-child(3), .dsr-table__head > :nth-child(4), .dsr-table__row > :nth-child(3), .dsr-table__row > :nth-child(4) { display: none; } .dsr-page__title { font-size: 18px; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-dock, .dsr-scrim, .dsr-dot, .dsr-radar__sweep, .dsr-progress__fill, .dsr-skeleton__row, .dsr-pulse-line i { animation: none !important; transition: none !important; } }",
  "/* ---- v2 layer system: elevation, tone, instrument tiles ---------------- */",
  ":root, body { --dsr-elev-1: 0 1px 2px rgba(15,23,42,.04), 0 10px 24px -18px rgba(15,23,42,.34), inset 0 1px 0 rgba(255,255,255,.9); --dsr-elev-2: 0 2px 6px rgba(15,23,42,.05), 0 20px 40px -24px rgba(15,23,42,.36), inset 0 1px 0 rgba(255,255,255,.95); --dsr-elev-live: 0 2px 6px rgba(15,23,42,.05), 0 28px 48px -28px color-mix(in srgb, var(--dsr-accent) 42%, rgba(15,23,42,.45)), inset 0 1px 0 rgba(255,255,255,.85); --dsr-well: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent); --dsr-well-line: color-mix(in srgb, var(--dsr-line) 62%, transparent); --dsr-inner-hi: rgba(255,255,255,.62); }",
  "[data-ds-dark-theme] { --dsr-elev-1: 0 14px 30px -22px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.035); --dsr-elev-2: 0 20px 42px -24px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.055); --dsr-elev-live: 0 26px 54px -26px color-mix(in srgb, var(--dsr-accent) 30%, rgba(0,0,0,.92)), inset 0 1px 0 rgba(255,255,255,.06); --dsr-well: rgba(255,255,255,.035); --dsr-well-line: rgba(255,255,255,.07); --dsr-inner-hi: rgba(255,255,255,.04); }",
  ".dsr-card { --dsr-tone: var(--dsr-muted); min-height: 252px; border-radius: 15px; border-color: var(--dsr-line); background: var(--dsr-bg); box-shadow: var(--dsr-elev-1); }",
  ".dsr-card::after { content: \"\"; position: absolute; left: 0; right: 0; top: 0; height: 2px; pointer-events: none; opacity: 0; background: linear-gradient(90deg, var(--dsr-tone), color-mix(in srgb, var(--dsr-tone) 45%, transparent) 34%, transparent 76%); transition: opacity 220ms ease; }",
  ".dsr-card[data-tone=\"running\"] { --dsr-tone: var(--dsr-green); }",
  ".dsr-card[data-tone=\"tool\"] { --dsr-tone: var(--dsr-accent); }",
  ".dsr-card[data-tone=\"approval\"], .dsr-card[data-tone=\"question\"] { --dsr-tone: var(--dsr-amber); }",
  ".dsr-card[data-tone=\"done\"] { --dsr-tone: var(--dsr-green); }",
  ".dsr-card[data-tone=\"migration\"] { --dsr-tone: var(--dsr-amber); }",
  ".dsr-card.is-live { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-tone) 6%, var(--dsr-bg)), var(--dsr-bg) 48%); box-shadow: var(--dsr-elev-live); }",
  ".dsr-card[data-tone=\"approval\"], .dsr-card[data-tone=\"question\"] { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-amber) 4%, var(--dsr-bg)), var(--dsr-bg) 44%); }",
  ".dsr-card.is-live::after, .dsr-card[data-tone=\"approval\"]::after, .dsr-card[data-tone=\"question\"]::after { opacity: 1; }",
  ".dsr-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--dsr-tone) 30%, var(--dsr-line)); box-shadow: var(--dsr-elev-2); }",
  ".dsr-card__head { padding: 12px 13px 0 14px; }",
  ".dsr-card__status { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; height: 20px; padding: 0 7px 0 6px; overflow: visible; border: 1px solid color-mix(in srgb, var(--dsr-tone) 22%, transparent); border-radius: 6px; background: color-mix(in srgb, var(--dsr-tone) 9%, transparent); color: var(--dsr-tone); font: var(--dsw-font-xxxs-strong-11); }",
  ".dsr-card__status .dsr-dot { width: 6px; height: 6px; margin: 0; background: currentColor; animation: none; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 16%, transparent); }",
  ".dsr-card__status-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card__main { padding: 9px 14px 0; }",
  ".dsr-card__title { font-size: 15px; line-height: 21px; font-weight: 600; letter-spacing: -.018em; }",
  ".dsr-card__meta { margin-top: 5px; }",
  ".dsr-card__live { min-height: 32px; padding: 6px 9px; border: 1px solid var(--dsr-well-line); border-radius: 9px; background: var(--dsr-well); box-shadow: inset 0 1px 0 var(--dsr-inner-hi); }",
  ".dsr-card.is-live .dsr-card__live { border-color: color-mix(in srgb, var(--dsr-tone) 20%, transparent); background: color-mix(in srgb, var(--dsr-tone) 8%, transparent); }",
  ".dsr-card .dsr-card__live .dsr-tool-glyph { color: var(--dsr-tone); }",
  ".dsr-signals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 11px; padding: 8px 0 7px; border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-signals__cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 0 9px; border-right: 1px solid var(--dsr-line-soft); }",
  ".dsr-signals__cell:first-child { padding-left: 0; }",
  ".dsr-signals__cell:last-child { padding-right: 0; border-right: 0; }",
  ".dsr-signals__label { display: flex; align-items: center; gap: 3px; min-width: 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 14px; }",
  ".dsr-signals__label span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-signals__label svg { flex: none; opacity: .78; }",
  ".dsr-signals__value { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 14px; line-height: 18px; font-variant-numeric: tabular-nums; }",
  ".dsr-cost { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 10px; margin-top: 9px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-cost__item { display: inline-flex; align-items: center; gap: 4px; min-width: 0; white-space: nowrap; }",
  ".dsr-cost__item svg { flex: none; opacity: .78; }",
  ".dsr-cost__item strong { color: var(--dsr-secondary); font-weight: 600; }",
  ".dsr-cost__label, .dsr-cost__unit { color: var(--dsr-muted); }",
  ".dsr-cost__sep { color: var(--dsr-line); }",
  ".dsr-cost__bar { width: 26px; height: 3px; border-radius: 2px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-cost__bar > i { display: block; height: 100%; border-radius: 2px; background: var(--dsr-accent); }",
  ".dsr-cost__bar.is-warn > i { background: var(--dsr-amber); }",
  ".dsr-card__footer { margin-top: 10px; min-height: 38px; padding: 8px 13px 9px 14px; border-top: 1px solid var(--dsr-line-soft); background: color-mix(in srgb, var(--dsr-bg) 86%, transparent); }",
  ".dsr-delivery { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px 0 6px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); white-space: nowrap; }",
  ".dsr-delivery.is-delivered { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 30%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-green) 7%, transparent); }",
  ".dsr-delivery.is-changed { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 28%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 6%, transparent); }",
  ".dsr-card.is-compact { min-height: 228px; }",
  ".dsr-card.is-compact .dsr-signals { margin-top: 9px; padding: 6px 0 5px; }",
  ".dsr-card.is-compact .dsr-card__title { font-size: 14px; line-height: 20px; }",
  ".dsr-board__head { align-items: center; gap: 11px; margin-bottom: 13px; }",
  ".dsr-board__mark { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-accent); }",
  ".dsr-board__headcopy { min-width: 0; margin-right: auto; }",
  ".dsr-board__head h2 { font-size: 15px; }",
  ".dsr-board__headmeta { gap: 7px; }",
  ".dsr-stat { display: flex; align-items: center; gap: 9px; }",
  ".dsr-stat__body { min-width: 0; display: flex; flex-direction: column; }",
  ".dsr-stat__icon { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-secondary); }",
  ".dsr-stat[data-tone=\"green\"] .dsr-stat__icon { color: var(--dsr-green); background: color-mix(in srgb, var(--dsr-green) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-green) 22%, var(--dsr-line-soft)); }",
  ".dsr-stat[data-tone=\"amber\"] .dsr-stat__icon { color: var(--dsr-amber); background: color-mix(in srgb, var(--dsr-amber) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-amber) 22%, var(--dsr-line-soft)); }",
  ".dsr-stat[data-tone=\"accent\"] .dsr-stat__icon { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-accent) 22%, var(--dsr-line-soft)); }",
  ".dsr-stats .dsr-stat { gap: 7px; padding: 9px 10px; }",
  ".dsr-stats .dsr-stat__icon { width: 24px; height: 24px; border-radius: 7px; }",
  ".dsr-stats .dsr-stat__value { font-size: 14px; line-height: 17px; }",
  ".dsr-page__stats { grid-template-columns: repeat(5, minmax(0, 1fr)); }",
  ".dsr-page__stats .dsr-stat { gap: 10px; padding: 11px 0; margin-right: 18px; }",
  ".dsr-page { background: var(--dsw-alias-bg-layer-2); } [data-ds-dark-theme] .dsr-page { background: var(--dsw-alias-bg-base); }",
  ".dsr-page__head { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-accent) 4%, transparent), transparent 76%); }",
  ".dsr-page__copy { min-width: 0; }",
  ".dsr-page__titlerow { display: flex; align-items: center; gap: 9px; min-width: 0; }",
  ".dsr-page__live { display: inline-flex; align-items: center; gap: 5px; height: 20px; padding: 0 8px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; background: var(--dsr-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); white-space: nowrap; }",
  ".dsr-page__live .dsr-dot { width: 5px; height: 5px; margin: 0; background: var(--dsr-muted); }",
  ".dsr-page__live.is-on { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 26%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-green) 7%, transparent); }",
  ".dsr-page__live.is-on .dsr-dot { background: var(--dsr-green); animation: dsr-pulse 2s ease-out infinite; }",
  ".dsr-card__title { display: -webkit-box; } .dsr-workspace-card { box-shadow: var(--dsr-elev-1); } .dsr-workspace-card:hover { box-shadow: var(--dsr-elev-2); } .dsr-artifact-card, .dsr-usage-card { box-shadow: var(--dsr-elev-1); } .dsr-artifact-card:hover, .dsr-usage-card:hover { box-shadow: var(--dsr-elev-2); } .dsr-artifact-card__icon { color: var(--dsr-accent); }",
  "/* ---- board: tracked lane ---------------------------------------------- */",
  ".dsr-board__section--tracked { position: relative; padding: 13px 14px 16px; border: 1px solid color-mix(in srgb, var(--dsr-accent) 20%, var(--dsr-line)); border-radius: 16px; background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-accent) 6%, transparent), color-mix(in srgb, var(--dsr-accent) 2%, transparent)); }",
  ".dsr-board__section--tracked::before { content: \"\"; position: absolute; left: 16px; right: 16px; top: -1px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--dsr-accent), transparent 72%); opacity: .65; }",
  ".dsr-board__section--tracked .dsr-board__head { padding: 0 2px; margin-bottom: 12px; }",
  ".dsr-board__section--tracked .dsr-board__mark { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 10%, var(--dsr-bg)); border-color: color-mix(in srgb, var(--dsr-accent) 24%, var(--dsr-line-soft)); }",
  ".dsr-card-grid--tracked { gap: 10px; }",
  ".dsr-board__section--tracked .dsr-card { box-shadow: var(--dsr-elev-1); }",
  "@media (max-width: 680px) { .dsr-board__section--tracked { padding: 11px 10px 13px; } }",
  "/* ---- page: filter bar ------------------------------------------------- */",
  ".dsr-filterbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; padding: 9px 12px; border: 1px solid var(--dsr-line); border-radius: 12px; background: var(--dsr-bg); box-shadow: var(--dsr-elev-1); }",
  ".dsr-filterbar.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line)); }",
  ".dsr-filterbar__lead { display: inline-flex; align-items: center; gap: 5px; margin-right: 2px; font: var(--dsw-font-xs); color: var(--dsr-muted); }",
  ".dsr-filter { display: inline-flex; align-items: center; gap: 6px; padding: 3px 4px 3px 9px; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: var(--dsr-well); color: var(--dsr-muted); transition: border-color .15s ease, background .15s ease; }",
  ".dsr-filter:hover { border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-filter__label { font: var(--dsw-font-xs); color: var(--dsr-muted); white-space: nowrap; }",
  ".dsr-filter__control { position: relative; display: inline-flex; align-items: center; min-width: 0; }",
  ".dsr-filter__select { appearance: none; -webkit-appearance: none; max-width: 190px; padding: 2px 18px 2px 2px; border: 0; background: transparent; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); cursor: pointer; text-overflow: ellipsis; color-scheme: light; }",
  "[data-ds-dark-theme] .dsr-filter__select { color-scheme: dark; }",
  ".dsr-filter__select:focus-visible { outline: none; }",
  ".dsr-filter__control svg { position: absolute; right: 2px; pointer-events: none; opacity: .55; }",
  ".dsr-filterbar__clear { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xs); cursor: pointer; }",
  ".dsr-filterbar__clear:hover { color: var(--dsr-text); border-color: var(--dsr-line); background: var(--dsr-well); }",
  ".dsr-filterbar__count { margin-left: auto; font: var(--dsw-font-xs); color: var(--dsr-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  "@media (max-width: 680px) { .dsr-filterbar { padding: 8px 10px; } .dsr-filterbar__count { margin-left: 0; } .dsr-filter__select { max-width: 132px; } }",
  "/* ---- detail: instrument stats ------------------------------------------ */",
  ".dsr-dstat { padding: 10px 11px 11px; }",
  ".dsr-dstat__head { display: flex; align-items: center; gap: 5px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-dstat__icon { width: 18px; height: 18px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 5px; background: var(--dsr-soft); color: var(--dsr-accent); }",
  ".dsr-dstat__value { margin-top: 5px; }",
  ".dsr-detail__section-title { display: flex; align-items: center; gap: 5px; }",
  ".dsr-detail__section-title svg { flex: none; opacity: .9; }",
  ".dsr-current__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-current__top { display: flex; align-items: center; gap: 7px; min-width: 0; }",
  ".dsr-current__icon { width: 22px; height: 22px; flex: none; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--dsr-accent) 24%, transparent); border-radius: 6px; background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); color: var(--dsr-accent); }",
  ".dsr-current__icon.is-warn { border-color: color-mix(in srgb, var(--dsr-amber) 26%, transparent); background: color-mix(in srgb, var(--dsr-amber) 10%, transparent); color: var(--dsr-amber); }",
  "/* ---- detail: session flow ---------------------------------------------- */",
  ".dsr-chain .dsr-tool-glyph { color: var(--dsr-accent); }",
  ".dsr-file-pill { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 21px; padding: 0 7px 0 5px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: color-mix(in srgb, var(--dsr-bg) 80%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }",
  ".dsr-file-pill:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-file-pill svg { flex: none; color: var(--dsr-accent); }",
  ".dsr-file-pill span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  "@container dsr-page (max-width: 1180px) { .dsr-page__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
  "@media (max-width: 680px) { .dsr-signals__cell { padding: 0 6px; } .dsr-page__live { display: none; } .dsr-page__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-board__mark { display: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-card, .dsr-card::after, .dsr-page__live .dsr-dot { animation: none !important; transition: none !important; } }",

  /* ---------- v3: editorial instrument layer ---------- */
  ".dsr-page { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-soft) 42%, var(--dsw-alias-bg-base)) 0, var(--dsw-alias-bg-base) 280px); }",
  ".dsr-page__head { position: relative; padding: 30px 32px 14px; gap: 24px; align-items: flex-start; }",
  ".dsr-page__head::before { content: \"\"; position: absolute; inset: 0 0 -20px; pointer-events: none; opacity: .5; background-image: radial-gradient(circle at 1px 1px, var(--dsr-line) 1px, transparent 0); background-size: 24px 24px; mask-image: radial-gradient(560px 190px at 82% 0%, #000 0%, transparent 78%); -webkit-mask-image: radial-gradient(560px 190px at 82% 0%, #000 0%, transparent 78%); }",
  ".dsr-page__head > * { position: relative; z-index: 1; }",
  ".dsr-page__heading { align-items: flex-start; gap: 14px; }",
  ".dsr-page__mark { width: 42px; height: 42px; margin-top: 2px; border-radius: 50%; border-color: var(--dsr-line); background: color-mix(in srgb, var(--dsr-bg) 72%, transparent); color: var(--dsr-accent); }",
  ".dsr-page__title { font-size: 27px; line-height: 33px; letter-spacing: -.025em; font-weight: 600; }",
  ".dsr-page__sub { margin-top: 5px; color: var(--dsr-muted); font-size: 13px; line-height: 20px; letter-spacing: -.005em; }",
  ".dsr-page__titlerow { gap: 12px; align-items: baseline; }",
  ".dsr-page__live { height: auto; padding: 0; border: 0; background: none; color: var(--dsr-muted); font-size: 11px; letter-spacing: .01em; }",
  ".dsr-page__live.is-on { background: none; border: 0; }",
  ".dsr-page__live.is-on .dsr-dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); }",
  ".dsr-page__toolbar { gap: 4px; }",
  ".dsr-page__toolbar .dsr-search { width: 248px; height: 34px; border-radius: 10px; background: var(--dsr-soft); border-color: transparent; transition: width 240ms cubic-bezier(.16,1,.3,1), border-color 160ms ease, background-color 160ms ease; }",
  ".dsr-page__toolbar .dsr-search:focus-within { width: 288px; background: var(--dsr-bg); border-color: var(--dsr-line); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-focus) 14%, transparent); }",
  ".dsr-page__stats { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 30px; padding: 0 32px 20px; border: 0; }",
  ".dsr-page__stats .dsr-stat { display: flex; align-items: center; flex: 0 0 auto; gap: 8px; padding: 0; margin: 0; border: 0; }",
  ".dsr-page__stats .dsr-stat__icon { width: auto; height: auto; border: 0; background: none; color: var(--dsr-muted); }",
  ".dsr-page__stats .dsr-stat[data-tone=\"green\"] .dsr-stat__icon { color: var(--dsr-green); background: none; border: 0; }",
  ".dsr-page__stats .dsr-stat[data-tone=\"amber\"] .dsr-stat__icon { color: var(--dsr-amber); background: none; border: 0; }",
  ".dsr-page__stats .dsr-stat[data-tone=\"accent\"] .dsr-stat__icon { color: var(--dsr-accent); background: none; border: 0; }",
  ".dsr-page__stats .dsr-stat__body { display: flex; align-items: baseline; gap: 6px; }",
  ".dsr-page__stats .dsr-stat__value { font-size: 17px; line-height: 21px; font-weight: 600; letter-spacing: -.02em; }",
  ".dsr-page__stats .dsr-stat__label { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsr-muted); }",
  ".dsr-page__views { height: 47px; padding: 0 32px; border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line); }",
  ".dsr-page__views .dsr-tabs { height: 100%; gap: 26px; }",
  ".dsr-page__views .dsr-tab { height: 100%; font-size: 13px; font-weight: 500; color: var(--dsr-muted); transition: color 160ms ease; }",
  ".dsr-tab:hover { color: var(--dsr-text); }",
  ".dsr-tab.is-active { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-page__views .dsr-tab::after { content: \"\"; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: var(--dsr-accent); transform: scaleX(0); transform-origin: 50% 100%; transition: transform 260ms cubic-bezier(.16,1,.3,1); }",
  ".dsr-page__views .dsr-tab.is-active::after { transform: scaleX(1); }",
  ".dsr-page__views .dsr-tab__count { margin-left: 6px; font-size: 11px; font-weight: 500; }",
  ".dsr-footer__status { flex: none; font-size: 11px; }",
  ".dsr-board { padding: 26px 32px 44px; }",
  ".dsr-board__section + .dsr-board__section { margin-top: 38px; }",
  ".dsr-board__head { align-items: flex-start; margin-bottom: 14px; gap: 10px; }",
  ".dsr-board__head h2 { font-size: 17px; line-height: 23px; letter-spacing: -.025em; font-weight: 600; }",
  ".dsr-board__head p { margin-top: 3px; font-size: 12px; line-height: 18px; }",
  ".dsr-board__mark { width: 20px; height: 20px; margin-top: 2px; border: 0; border-radius: 0; background: none; color: var(--dsr-muted); }",
  ".dsr-board__count { height: auto; padding: 0; border: 0; background: none; color: var(--dsr-muted); font-size: 12px; font-weight: 500; letter-spacing: .01em; }",
  ".dsr-board__headmeta { gap: 12px; }",
  ".dsr-board__quiet { min-height: 0; padding: 14px 0; border: 0; border-radius: 0; background: transparent; }",
  ".dsr-card-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }",
  ".dsr-card { min-height: 0; cursor: pointer; border-radius: 16px; border-color: var(--dsr-line-soft); background: var(--dsr-bg); box-shadow: 0 1px 2px rgba(16, 24, 40, .035); transition: transform 260ms cubic-bezier(.16,1,.3,1), border-color 200ms ease, box-shadow 260ms cubic-bezier(.16,1,.3,1); }",
  ".dsr-card::before, .dsr-card::after { display: none; }",
  ".dsr-card:hover { transform: translateY(-3px); border-color: var(--dsr-line); box-shadow: 0 22px 44px -30px rgba(16, 24, 40, .35), 0 2px 6px rgba(16, 24, 40, .05); }",
  ".dsr-card:active { transform: translateY(-1px); }",
  ".dsr-card.is-live { grid-column: span 2; border-color: var(--dsr-line); background: var(--dsr-bg); }",
  ".dsr-card-grid--live .dsr-card:first-child .dsr-card__title { font-size: 17px; line-height: 24px; letter-spacing: -.02em; }",
  ".dsr-card-grid--live .dsr-card:first-child .dsr-signals__value { font-size: 16px; }",
  ".dsr-card__head { padding: 15px 16px 0 18px; }",
  ".dsr-card__statusline { gap: 8px; }",
  ".dsr-card__status { height: auto; padding: 0; border: 0; background: none; color: var(--dsr-secondary); font-size: 11px; font-weight: 500; letter-spacing: .01em; }",
  ".dsr-card__status .dsr-dot { width: 6px; height: 6px; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 10%, transparent); }",
  ".dsr-card__main { padding: 11px 18px 16px; }",
  ".dsr-card__title { font-size: 15px; line-height: 22px; letter-spacing: -.015em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }",
  ".dsr-card__meta { margin-top: 5px; font-size: 12px; line-height: 18px; }",
  ".dsr-card__live { margin-top: 12px; min-height: 22px; padding: 0; gap: 6px; border: 0; border-radius: 0; background: none; box-shadow: none; font-size: 12px; line-height: 18px; }",
  ".dsr-card.is-live .dsr-card__live { margin: 12px -18px 0; padding: 8px 18px; border-radius: 0; background: color-mix(in srgb, var(--dsr-accent) 5.5%, transparent); }",
  ".dsr-card__live-label { font-weight: 600; }",
  ".dsr-card__live-time { font-size: 11px; }",
  ".dsr-card__progress { margin-top: 10px; }",
  ".dsr-signals { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 15px; padding: 12px 0 0; border-top: 1px solid var(--dsr-line-soft); border-bottom: 0; }",
  ".dsr-signals__cell { padding: 0; border: 0; gap: 3px; }",
  ".dsr-signals__label { font-size: 10.5px; line-height: 14px; letter-spacing: .02em; }",
  ".dsr-signals__value { font-size: 15px; line-height: 19px; letter-spacing: -.015em; }",
  ".dsr-cost { margin-top: 11px; gap: 6px 12px; font-size: 11px; }",
  ".dsr-cost__bar { width: 22px; height: 2px; }",
  ".dsr-card__footer { margin-top: 0; padding: 0 18px; min-height: 44px; border-top: 1px solid var(--dsr-line-soft); background: transparent; }",
  ".dsr-delivery { height: auto; padding: 0; border: 0; background: none; font-size: 11px; }",
  ".dsr-delivery.is-delivered { background: none; border: 0; }",
  ".dsr-delivery.is-changed { background: none; border: 0; }",
  ".dsr-card__enter { height: 26px; padding: 0; border: 0; background: none; color: var(--dsr-muted); font-size: 11px; gap: 3px; }",
  ".dsr-card__enter:hover { color: var(--dsr-accent); background: none; }",
  ".dsr-card__enter svg { transition: transform 200ms cubic-bezier(.16,1,.3,1); }",
  ".dsr-card__enter:hover svg { transform: translateX(2px); }",
  ".dsr-card__headactions .dsr-icon-btn { opacity: 0; transition: opacity 160ms ease, background-color 140ms ease, color 140ms ease; }",
  ".dsr-card:hover .dsr-card__headactions .dsr-icon-btn, .dsr-card:focus-within .dsr-card__headactions .dsr-icon-btn, .dsr-card__headactions .dsr-icon-btn.is-active { opacity: 1; }",
  "@media (hover: none) { .dsr-card__headactions .dsr-icon-btn { opacity: 1; } }",
  ".dsr-filterbar { margin: 0 0 22px; padding: 0; border: 0; background: transparent; box-shadow: none; gap: 8px; }",
  ".dsr-filterbar.is-active { border: 0; }",
  ".dsr-filterbar__lead { font-size: 11px; gap: 5px; margin-right: 4px; }",
  ".dsr-filter { height: 30px; padding: 0 6px 0 12px; border-color: transparent; border-radius: 999px; background: var(--dsr-soft); }",
  ".dsr-filter:hover { border-color: transparent; background: color-mix(in srgb, var(--dsr-soft) 40%, var(--dsr-line-soft)); }",
  ".dsr-filter__label { font-size: 11px; }",
  ".dsr-filter__select { font-size: 12px; font-weight: 500; }",
  ".dsr-filterbar__clear { height: 28px; border-radius: 999px; padding: 0 11px; font-size: 11px; }",
  ".dsr-filterbar__count { font-size: 11px; }",
  ".dsr-detail--page .dsr-detail__head { padding: 22px 22px 16px; gap: 6px; align-items: flex-start; }",
  ".dsr-detail--page .dsr-detail__title { font-size: 19px; line-height: 25px; letter-spacing: -.02em; font-weight: 600; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }",
  ".dsr-detail--page .dsr-detail__sub { margin-top: 6px; font-size: 12px; line-height: 18px; white-space: normal; }",
  ".dsr-detail--page .dsr-detail__body { padding: 0 22px 32px; }",
  ".dsr-detail--page .dsr-detail__section { padding: 19px 0; }",
  ".dsr-detail--page .dsr-detail__section-head { margin-bottom: 11px; }",
  ".dsr-detail--page .dsr-detail__section-title { font-size: 11px; font-weight: 600; letter-spacing: .04em; }",
  ".dsr-detail--page .dsr-detail__section-meta { font-size: 11px; }",
  ".dsr-detail--page .dsr-dstat { padding: 12px 13px 13px; }",
  ".dsr-detail--page .dsr-dstat__value { font-size: 17px; }",
  ".dsr-board__foot { margin-top: 34px; padding-top: 14px; border-top: 1px solid var(--dsr-line-soft); font-size: 11px; }",
  "@keyframes dsr-rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }",
  ".dsr-page__head, .dsr-page__stats, .dsr-page__views { animation: dsr-rise 460ms cubic-bezier(.16,1,.3,1) both; }",
  ".dsr-page__stats { animation-delay: 50ms; }",
  ".dsr-page__views { animation-delay: 100ms; }",
  ".dsr-board__section { animation: dsr-rise 540ms cubic-bezier(.16,1,.3,1) both; animation-delay: 120ms; }",
  ".dsr-board__section:nth-child(2) { animation-delay: 170ms; }",
  ".dsr-board__section:nth-child(3) { animation-delay: 220ms; }",
  ".dsr-board__section:nth-child(4) { animation-delay: 270ms; }",
  ".dsr-card { animation: dsr-rise 520ms cubic-bezier(.16,1,.3,1) backwards; }",
  ".dsr-card:nth-child(2) { animation-delay: 30ms; }",
  ".dsr-card:nth-child(3) { animation-delay: 60ms; }",
  ".dsr-card:nth-child(4) { animation-delay: 90ms; }",
  ".dsr-card:nth-child(5) { animation-delay: 120ms; }",
  ".dsr-card:nth-child(6) { animation-delay: 150ms; }",
  "[data-ds-dark-theme] .dsr-card { border-color: var(--dsr-line); box-shadow: none; }",
  "[data-ds-dark-theme] .dsr-card:hover { box-shadow: 0 24px 48px -30px rgba(0, 0, 0, .9); }",
  "[data-ds-dark-theme] .dsr-page__head::before { opacity: .3; }",
  "@container dsr-page (max-width: 900px) { .dsr-page__head { padding: 24px 22px 12px; } .dsr-page__stats { padding: 0 22px 16px; gap: 8px 20px; } .dsr-page__views { padding: 0 22px; } .dsr-board { padding: 22px 22px 36px; } .dsr-page__toolbar .dsr-search { width: 200px; } .dsr-page__toolbar .dsr-search:focus-within { width: 240px; } }",
  "@container dsr-page (max-width: 700px) { .dsr-page__head { flex-wrap: wrap; } .dsr-page__title { font-size: 23px; line-height: 29px; } .dsr-page__mark { width: 36px; height: 36px; } .dsr-page__toolbar { width: 100%; } .dsr-page__toolbar .dsr-search { flex: 1 1 auto; width: auto; } .dsr-page__toolbar .dsr-search:focus-within { width: auto; } }",
  "@media (max-width: 680px) { .dsr-page__head { padding: 20px 16px 10px; flex-wrap: wrap; } .dsr-page__toolbar { width: 100%; } .dsr-page__toolbar .dsr-search { flex: 1; width: auto; } .dsr-page__stats { padding: 0 16px 14px; gap: 7px 16px; } .dsr-page__views { padding: 0 16px; } .dsr-page__views .dsr-tabs { gap: 18px; } .dsr-board { padding: 20px 16px 32px; } .dsr-card.is-live { grid-column: auto; } .dsr-card-grid { grid-template-columns: minmax(0, 1fr); } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-page__head, .dsr-page__stats, .dsr-page__views, .dsr-board__section, .dsr-card { animation: none !important; } }",

  ".dsr-card.is-selected { border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 9%, transparent), 0 18px 40px -30px rgba(16, 24, 40, .3); }",
  ".dsr-card:focus-within { border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-filter.is-set { border-color: color-mix(in srgb, var(--dsr-accent) 26%, transparent); background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-soft)); }",
  ".dsr-filter.is-set .dsr-filter__label, .dsr-filter.is-set .dsr-filter__select { color: var(--dsr-accent); }",
  ".dsr-icon-btn.is-active svg { animation: dsr-pop 280ms cubic-bezier(.2, 1.5, .4, 1); }",
  "@keyframes dsr-pop { 0% { transform: scale(.72); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-icon-btn.is-active svg { animation: none !important; } }",

  ".dsr-page__toolbar .dsr-icon-btn { width: 32px; height: 32px; border-radius: 9px; }",
  ".dsr-button { transition: transform 120ms ease, background-color 140ms ease, border-color 140ms ease, color 140ms ease; }",
  ".dsr-button:active, .dsr-icon-btn:active { transform: scale(.96); }",
  ".dsr-page__views .dsr-tabs { min-width: 0; flex: 1 1 auto; overflow-x: auto; scrollbar-width: none; }",
  ".dsr-page__views .dsr-tabs::-webkit-scrollbar { display: none; }",
  ".dsr-board__section--tracked .dsr-board__mark { color: var(--dsr-accent); background: none; border: 0; }",
  ".dsr-board__section--active .dsr-board__mark { color: var(--dsr-green); }",
  ".dsr-board__section--recent .dsr-board__mark { color: var(--dsr-muted); }",
  ".dsr-board__section--tracked { padding: 0; border: 0; border-radius: 0; background: none; }",
  ".dsr-board__section--tracked::before { display: none; }",
  ".dsr-board__section--tracked .dsr-board__head { padding: 0; }",
  ".dsr-board__section--tracked .dsr-card { box-shadow: 0 1px 2px rgba(16, 24, 40, .035); }",
  ".dsr-empty { gap: 9px; padding: 54px 26px 50px; }",
  ".dsr-empty__icon { width: 44px; height: 44px; border-radius: 50%; color: var(--dsr-accent); }",
  ".dsr-empty__title { font-size: 16px; line-height: 23px; letter-spacing: -.015em; }",
  ".dsr-empty__text { max-width: 320px; font-size: 13px; line-height: 20px; }",
  ".dsr-page__body.has-selection .dsr-page__detail { animation: dsr-panel-in 280ms cubic-bezier(.16,1,.3,1); }",
  "@keyframes dsr-panel-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-page__body.has-selection .dsr-page__detail { animation: none !important; } }",
  ".dsr-filter:focus-within { border-color: var(--dsr-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-focus) 14%, transparent); }",
  ".dsr-page__head > * { position: relative; z-index: 1; }",
  ".dsr-review-dot { position: absolute; z-index: 3; top: 8px; left: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--dsr-green); box-shadow: 0 0 0 2px var(--dsr-bg), 0 0 0 4px color-mix(in srgb, var(--dsr-green) 14%, transparent); animation: dsr-review-in 380ms cubic-bezier(.16,1,.3,1) both; }",
  ".dsr-session-row > .dsr-review-dot { top: 7px; left: 6px; width: 6px; height: 6px; box-shadow: 0 0 0 1.5px var(--dsr-bg); pointer-events: none; }",
  "@keyframes dsr-review-in { from { opacity: 0; transform: scale(.45); } 65% { opacity: 1; transform: scale(1.08); } to { opacity: 1; transform: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-review-dot { animation: none !important; } }",
  ".dsr-review-dot.is-inline { position: static; top: auto; left: auto; display: inline-block; width: 6px; height: 6px; margin-right: 6px; vertical-align: 1px; box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); animation: none; }",
  /* Configurable card sheets: static paint only, no filters or animated textures; texture "none" opts out. */
  ".dsr-page[data-card-tint=\"auto\"] .dsr-card { background-color: var(--dsr-bg); }",
  ".dsr-page[data-card-tint=\"sand\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 91%, var(--dsr-amber) 9%); }",
  ".dsr-page[data-card-tint=\"mist\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 92%, var(--dsr-accent) 8%); }",
  ".dsr-page[data-card-tint=\"sage\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 92%, var(--dsr-green) 8%); }",
  "[data-ds-dark-theme] .dsr-page[data-card-tint=\"sand\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 88%, var(--dsr-amber) 12%); }",
  "[data-ds-dark-theme] .dsr-page[data-card-tint=\"mist\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 89%, var(--dsr-accent) 11%); }",
  "[data-ds-dark-theme] .dsr-page[data-card-tint=\"sage\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 89%, var(--dsr-green) 11%); }",
  ":where(.dsr-page[data-card-tint]) .dsr-card { border-color: color-mix(in srgb, var(--dsr-line) 78%, var(--dsr-bg)); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 38%, transparent), 0 1px 2px rgba(16, 24, 40, .045), 0 10px 22px -20px rgba(16, 24, 40, .3); }",
  "[data-ds-dark-theme] :where(.dsr-page[data-card-tint]) .dsr-card { border-color: var(--dsr-line); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 10px 24px -20px rgba(0, 0, 0, .8); }",
  ".dsr-page[data-card-texture=\"paper\"] .dsr-card::before { content: \"\"; display: block; position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit; opacity: .7; background: none; background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 7%, transparent) .55px, transparent .9px); background-size: 4px 4px; }",
  ".dsr-page[data-card-texture=\"dots\"] .dsr-card::before { content: \"\"; display: block; position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit; opacity: .8; background: none; background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 8%, transparent) .9px, transparent 1.1px); background-size: 14px 14px; }",
  ".dsr-prefs__menu { max-height: min(560px, calc(100vh - 88px)); overflow-y: auto; }",
  ".dsr-prefs__divider { height: 1px; margin: 6px 8px; background: var(--dsr-line-soft); }",
  ".dsr-prefs__label { padding: 5px 8px 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .04em; }",
  ".dsr-swatches, .dsr-textures { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 0 4px 4px; }",
  ".dsr-swatch, .dsr-texture-option { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 2px 5px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }",
  ".dsr-swatch:hover, .dsr-texture-option:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }",
  ".dsr-swatch.is-active, .dsr-texture-option.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 6%, var(--dsr-bg)); color: var(--dsr-text); }",
  ".dsr-swatch__dot { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsr-text) 8%, transparent); }",
  ".dsr-swatch.is-active .dsr-swatch__dot { box-shadow: 0 0 0 2px var(--dsr-bg), 0 0 0 3.5px var(--dsr-accent), inset 0 0 0 1px color-mix(in srgb, var(--dsr-text) 8%, transparent); }",
  ".dsr-texture-option__preview { width: 20px; height: 15px; border: 1px solid var(--dsr-line-soft); border-radius: 4px; background-color: var(--dsr-bg); }",
  ".dsr-texture-option__preview[data-texture=\"paper\"] { background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 12%, transparent) .5px, transparent .7px); background-size: 3px 3px; }",
  ".dsr-texture-option__preview[data-texture=\"dots\"] { background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 18%, transparent) .8px, transparent 1px); background-size: 5px 5px; }",
  ".dsr-swatch:focus-visible, .dsr-texture-option:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 1px; }",
  ".dsr-dock { background: var(--dsr-bg); background: color-mix(in srgb, var(--dsr-bg) 78%, transparent); background-image: linear-gradient(135deg, rgba(255,255,255,.14), transparent 38%, rgba(255,255,255,.035) 68%, rgba(0,0,0,.025)); -webkit-backdrop-filter: blur(24px) saturate(1.35); backdrop-filter: blur(24px) saturate(1.35); box-shadow: var(--dsw-shadow-lv3), inset 0 1px 0 color-mix(in srgb, #fff 52%, transparent); }",
  ".dsr-dock .dsr-prefs { position: static; }",
  ".dsr-dock .dsr-prefs__menu { position: absolute; inset: 0; width: auto; max-height: none; border-radius: inherit; padding: 10px 12px 14px; background: var(--dsr-bg); box-shadow: none; z-index: 20; overflow-y: auto; overscroll-behavior: contain; }",
  ".dsr-prefs__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 0 0 2px; }",
  ".dsr-prefs__head .dsr-prefs__title { padding: 5px 4px 6px; }",
  ".dsr-prefs__head .dsr-icon-btn { width: 25px; height: 25px; }",
  ".dsr-dock .dsr-prefs__note { display: none; }",
  ".dsr-rail { background: var(--dsr-bg); background: color-mix(in srgb, var(--dsr-bg) 80%, transparent); background-image: linear-gradient(135deg, rgba(255,255,255,.13), transparent 46%, rgba(0,0,0,.02)); -webkit-backdrop-filter: blur(20px) saturate(1.3); backdrop-filter: blur(20px) saturate(1.3); }",
  ".dsr-prefs__menu { background: var(--dsr-bg); -webkit-backdrop-filter: blur(18px) saturate(1.2); backdrop-filter: blur(18px) saturate(1.2); }",
  "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .dsr-dock, .dsr-rail, .dsr-prefs__menu { background: var(--dsr-bg); } }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-rail.dsr-rail { background-color: color-mix(in srgb, var(--dsr-bg) 80%, transparent) !important; background-image: linear-gradient(135deg, rgba(255,255,255,.13), transparent 46%, rgba(0,0,0,.02)) !important; color: var(--dsr-secondary) !important; border-color: var(--dsr-line) !important; border-radius: 21px !important; box-shadow: var(--dsw-shadow-lv2) !important; -webkit-backdrop-filter: blur(20px) saturate(1.3) !important; backdrop-filter: blur(20px) saturate(1.3) !important; }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-dock.dsr-dock { background-color: color-mix(in srgb, var(--dsr-bg) 78%, transparent) !important; background-image: linear-gradient(135deg, rgba(255,255,255,.14), transparent 38%, rgba(255,255,255,.035) 68%, rgba(0,0,0,.025)) !important; border-color: var(--dsr-line) !important; border-radius: 26px !important; box-shadow: var(--dsw-shadow-lv3) !important; -webkit-backdrop-filter: blur(24px) saturate(1.35) !important; backdrop-filter: blur(24px) saturate(1.35) !important; }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-dock.dsr-dock .dsr-prefs__menu { background: var(--dsr-bg) !important; border-color: var(--dsr-line) !important; border-radius: 11px !important; box-shadow: var(--dsw-shadow-lv3) !important; }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-dock.dsr-dock button, html[data-omd-layout=\"glyph-motion\"] .dsr-page.dsr-page button { border-radius: 7px !important; }",
  ".dsr-inline-note { display: flex; align-items: center; gap: 7px; margin: 9px 0 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--dsr-green) 24%, var(--dsr-line-soft)); border-radius: 8px; background: color-mix(in srgb, var(--dsr-green) 6%, var(--dsr-bg)); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }",
  ".dsr-inline-note.is-error { border-color: color-mix(in srgb, var(--dsr-red) 26%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-red) 6%, var(--dsr-bg)); color: var(--dsr-red); }",
  ".dsr-modal__scrim { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 22px; background: color-mix(in srgb, #101828 38%, transparent); backdrop-filter: blur(6px); animation: dsr-fade 140ms ease-out; }",
  ".dsr-modal { width: min(430px, 100%); padding: 19px 20px 17px; border: 1px solid var(--dsr-line); border-radius: 15px; background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 24px 70px -24px rgba(16, 24, 40, .5); animation: dsr-modal-in 180ms cubic-bezier(.2,.8,.2,1); }",
  ".dsr-modal__head { display: flex; align-items: center; gap: 9px; }",
  ".dsr-modal__icon { width: 30px; height: 30px; display: grid; place-items: center; flex: none; border-radius: 9px; background: color-mix(in srgb, var(--dsr-red) 9%, var(--dsr-soft)); color: var(--dsr-red); }",
  ".dsr-modal__title { margin: 0; font: var(--dsw-font-s-strong-15); font-size: 16px; letter-spacing: -.015em; }",
  ".dsr-modal__text { margin: 12px 0 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 19px; }",
  ".dsr-modal__list { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; padding: 8px 9px; border-radius: 8px; background: var(--dsr-soft); }",
  ".dsr-modal__item { overflow: hidden; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-modal__item::before { content: \"·\"; margin-right: 6px; color: var(--dsr-red); }",
  ".dsr-modal__more { margin: 7px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-modal__actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 18px; }",
  ".dsr-modal__actions .dsr-button--danger { min-width: 92px; }",
  "@keyframes dsr-modal-in { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }",
  ".dsr-activity { padding-bottom: 36px; }",
  ".dsr-activity__summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 3px 0 14px; border: 1px solid var(--dsr-line-soft); border-radius: 12px; background: color-mix(in srgb, var(--dsr-bg) 84%, var(--dsr-soft)); overflow: hidden; }",
  ".dsr-activity__metric { min-width: 0; display: flex; align-items: center; gap: 9px; padding: 12px 14px; border: 0; border-left: 1px solid var(--dsr-line-soft); border-radius: 0; background: transparent; transition: background-color 140ms ease; }",
  ".dsr-activity__metric:first-child { border-left: 0; }",
  ".dsr-activity__metric:hover { background: color-mix(in srgb, var(--dsr-accent) 3%, transparent); }",
  ".dsr-activity__metric-icon { width: 28px; height: 28px; display: grid; place-items: center; flex: none; border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-muted); }",
  ".dsr-activity__metric--tokens .dsr-activity__metric-icon { background: color-mix(in srgb, var(--dsr-accent) 9%, var(--dsr-soft)); color: var(--dsr-accent); }",
  ".dsr-activity__metric--time .dsr-activity__metric-icon { background: color-mix(in srgb, var(--dsr-green) 9%, var(--dsr-soft)); color: var(--dsr-green); }",
  ".dsr-activity__metric--sessions .dsr-activity__metric-icon { background: color-mix(in srgb, var(--dsr-amber) 10%, var(--dsr-soft)); color: var(--dsr-amber); }",
  ".dsr-activity__metric-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }",
  ".dsr-activity__metric-label { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-activity__metric-value { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 16px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-activity__panel { margin-top: 10px; padding: 14px 15px 13px; border: 1px solid var(--dsr-line-soft); border-radius: 13px; background: var(--dsr-bg); box-shadow: 0 1px 2px rgba(16, 24, 40, .025); }",
  ".dsr-activity__panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 25px; }",
  ".dsr-activity__panel-title { display: flex; align-items: center; gap: 6px; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-activity__panel-title .dsr-icon { color: var(--dsr-muted); }",
  ".dsr-activity__modes { display: flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); }",
  ".dsr-activity__mode { min-width: 45px; display: flex; align-items: baseline; justify-content: center; gap: 4px; height: 25px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xs-13); cursor: pointer; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }",
  ".dsr-activity__mode small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-weight: 400; }",
  ".dsr-activity__mode:hover { color: var(--dsr-text); }",
  ".dsr-activity__mode.is-active { background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08); }",
  ".dsr-activity__mode.is-active small { color: var(--dsr-secondary); }",
  ".dsr-activity__chart-wrap { position: relative; margin-top: 12px; }",
  ".dsr-activity__legend { display: flex; align-items: center; gap: 13px; margin: 0 0 7px 1px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-activity__legend span { display: inline-flex; align-items: center; gap: 5px; }",
  ".dsr-activity__legend i { width: 7px; height: 7px; border-radius: 2px; display: inline-block; }",
  ".dsr-activity__legend i.is-token { background: var(--dsr-accent); }",
  ".dsr-activity__legend i.is-time { background: color-mix(in srgb, var(--dsr-green) 72%, var(--dsr-bg)); }",
  ".dsr-activity__chart { display: flex; align-items: stretch; gap: 4px; height: 151px; padding: 0 1px; border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-activity__bucket { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 7px; padding: 4px 1px 0; border: 0; border-radius: 6px 6px 0 0; background: transparent; color: var(--dsr-muted); cursor: pointer; transition: background-color 130ms ease; }",
  ".dsr-activity__bucket:hover { background: color-mix(in srgb, var(--dsr-accent) 4%, transparent); }",
  ".dsr-activity__bucket.is-active { background: color-mix(in srgb, var(--dsr-accent) 6%, transparent); }",
  ".dsr-activity__plot { width: 100%; height: 118px; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }",
  ".dsr-activity__bar { width: min(9px, 38%); height: 100%; display: flex; align-items: flex-end; border-radius: 3px 3px 0 0; overflow: hidden; }",
  ".dsr-activity__bar i { display: block; width: 100%; min-height: 0; border-radius: 3px 3px 0 0; transition: height 240ms cubic-bezier(.2,.8,.2,1); }",
  ".dsr-activity__bar--token i { background: color-mix(in srgb, var(--dsr-accent) 68%, var(--dsr-bg)); }",
  ".dsr-activity__bar--time i { background: color-mix(in srgb, var(--dsr-green) 48%, var(--dsr-bg)); }",
  ".dsr-activity__bucket.is-active .dsr-activity__bar--token i { background: var(--dsr-accent); }",
  ".dsr-activity__bucket.is-active .dsr-activity__bar--time i { background: color-mix(in srgb, var(--dsr-green) 78%, var(--dsr-bg)); }",
  ".dsr-activity__bucket-label { max-width: 100%; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-activity__bucket.is-active .dsr-activity__bucket-label { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-activity__quiet { margin-top: 12px; padding: 17px 12px; border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-muted); font: var(--dsw-font-xxs-12); text-align: center; }",
  ".dsr-wall-panel { overflow: hidden; }",
  ".dsr-activity__wall-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-wall__scroll { margin-top: 11px; overflow-x: auto; padding-bottom: 2px; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-wall__inner { min-width: 666px; padding: 1px 0 2px; }",
  ".dsr-wall__months { position: relative; height: 14px; margin-left: 21px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-wall__month { position: absolute; top: 0; white-space: nowrap; transform: translateX(0); }",
  ".dsr-wall__body { display: flex; align-items: flex-start; gap: 6px; }",
  ".dsr-wall__days { display: grid; grid-template-rows: repeat(7, 10px); gap: 2px; width: 16px; padding-top: 1px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 10px; text-align: right; }",
  ".dsr-wall__weeks { display: flex; gap: 2px; }",
  ".dsr-wall__week { display: grid; grid-template-rows: repeat(7, 10px); gap: 2px; }",
  ".dsr-wall__cell { width: 10px; height: 10px; display: block; border: 1px solid transparent; border-radius: 2px; background: color-mix(in srgb, var(--dsr-line-soft) 60%, var(--dsr-bg)); }",
  ".dsr-wall__cell.is-level-1 { background: color-mix(in srgb, var(--dsr-accent) 16%, var(--dsr-soft)); }",
  ".dsr-wall__cell.is-level-2 { background: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-soft)); }",
  ".dsr-wall__cell.is-level-3 { background: color-mix(in srgb, var(--dsr-accent) 58%, var(--dsr-soft)); }",
  ".dsr-wall__cell.is-level-4 { background: var(--dsr-accent); }",
  ".dsr-wall__cell.is-future { background: transparent; border-color: var(--dsr-line-soft); opacity: .5; }",
  "[data-ds-dark-theme] .dsr-wall__cell { background: color-mix(in srgb, var(--dsr-line-soft) 48%, var(--dsr-bg)); }",
  "[data-ds-dark-theme] .dsr-wall__cell.is-level-1 { background: color-mix(in srgb, var(--dsr-accent) 22%, var(--dsr-bg)); }",
  "[data-ds-dark-theme] .dsr-wall__cell.is-level-2 { background: color-mix(in srgb, var(--dsr-accent) 40%, var(--dsr-bg)); }",
  ".dsr-wall__legend { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 8px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-wall__legend .dsr-wall__cell { width: 8px; height: 8px; }",
  ".dsr-activity__detail-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-activity__session-list { display: flex; flex-direction: column; margin-top: 9px; }",
  ".dsr-activity__session { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 13px; padding: 9px 7px; border: 0; border-top: 1px solid var(--dsr-line-soft); background: transparent; color: var(--dsr-secondary); text-align: left; cursor: pointer; transition: background-color 130ms ease; }",
  ".dsr-activity__session:first-child { border-top: 0; }",
  ".dsr-activity__session:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-activity__session-name { overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-activity__session-turns { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-activity__session-value { color: var(--dsr-green); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-activity__session-tokens { min-width: 64px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }",
  ".dsr-history-card .dsr-icon-btn.is-danger { flex: none; opacity: .55; }",
  ".dsr-history-card:hover .dsr-icon-btn.is-danger, .dsr-history-card .dsr-icon-btn.is-danger:focus-visible { opacity: 1; }",
  "@media (max-width: 860px) { .dsr-activity__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-activity__metric:nth-child(3) { border-left: 0; border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__metric:nth-child(4) { border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__chart { height: 132px; } .dsr-activity__plot { height: 99px; } }",
  "@media (max-width: 560px) { .dsr-activity { padding-left: 16px; padding-right: 16px; } .dsr-activity__panel { padding: 12px 11px 11px; } .dsr-activity__panel-head { align-items: flex-start; flex-direction: column; gap: 8px; } .dsr-activity__modes { align-self: stretch; justify-content: flex-start; } .dsr-activity__session { grid-template-columns: minmax(0, 1fr) auto; row-gap: 3px; } .dsr-activity__session-value { text-align: right; } .dsr-activity__session-tokens { grid-column: 2; text-align: right; } .dsr-modal { padding: 16px; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-modal, .dsr-modal__scrim, .dsr-activity__bar i { animation: none !important; transition: none !important; } }",
  ".dsr-activity__summary { grid-template-columns: repeat(5, minmax(0, 1fr)); }",
  ".dsr-activity__metric--calls .dsr-activity__metric-icon { background: color-mix(in srgb, #8b5cf6 12%, var(--dsr-soft)); color: #7c3aed; }",
  "[data-ds-dark-theme] .dsr-activity__metric--calls .dsr-activity__metric-icon { background: color-mix(in srgb, #a78bfa 16%, var(--dsr-bg)); color: #c4b5fd; }",
  ".dsr-activity__controls { display: flex; align-items: center; justify-content: flex-end; gap: 7px; flex-wrap: wrap; min-width: 0; }",
  ".dsr-activity__chart-switch { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); }",
  ".dsr-activity__chart-switch-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 25px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }",
  ".dsr-activity__chart-switch-btn:hover { color: var(--dsr-text); }",
  ".dsr-activity__chart-switch-btn.is-active { background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08); }",
  ".dsr-activity__chart-switch-btn:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 48%, transparent); outline-offset: 1px; }",
  ".dsr-activity__chart-sub { margin: 5px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-activity__chart-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 7px 1px; }",
  ".dsr-activity__chart-meta .dsr-activity__legend { margin: 0; }",
  ".dsr-activity__chart-total { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-activity__chart--hours { gap: 2px; }",
  ".dsr-activity__chart--hours .dsr-activity__bar { width: min(8px, 36%); }",
  ".dsr-activity__chart--hours .dsr-activity__bucket-label { font-size: 10px; }",
  ".dsr-activity__pie-wrap { margin-top: 8px; }",
  ".dsr-activity__pie { display: flex; align-items: center; justify-content: center; gap: 25px; min-height: 176px; padding: 7px 10px 3px; }",
  ".dsr-activity__pie-figure { position: relative; flex: none; width: 154px; height: 154px; }",
  ".dsr-activity__pie-figure svg { display: block; width: 100%; height: 100%; }",
  ".dsr-activity__pie-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; text-align: center; }",
  ".dsr-activity__pie-center strong { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 20px; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }",
  ".dsr-activity__pie-center small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-activity__model-list { min-width: 0; flex: 0 1 460px; max-width: 520px; display: flex; flex-direction: column; gap: 0; max-height: 174px; overflow-y: auto; }",
  ".dsr-activity__model-row { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto auto; align-items: center; gap: 9px; min-height: 29px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-activity__model-row:first-child { border-top: 0; }",
  ".dsr-activity__model-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent); }",
  ".dsr-activity__model-name { min-width: 0; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-activity__model-calls { color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-activity__model-share { min-width: 31px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-align: right; }",
  "@media (max-width: 860px) { .dsr-activity__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-activity__metric:nth-child(3) { border-left: 0; border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__metric:nth-child(4) { border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__metric:nth-child(5) { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__controls { width: 100%; justify-content: space-between; } .dsr-activity__pie { gap: 18px; } .dsr-activity__pie-figure { width: 140px; height: 140px; } }",
  "@media (max-width: 560px) { .dsr-activity__controls { align-items: flex-start; flex-wrap: wrap; } .dsr-activity__modes { flex: 1 1 100%; justify-content: space-between; } .dsr-activity__chart-switch { align-self: flex-start; } .dsr-activity__pie { flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 12px; padding-left: 3px; padding-right: 3px; } .dsr-activity__model-list { width: 100%; flex: 1 1 auto; max-width: none; max-height: none; } .dsr-activity__chart--hours .dsr-activity__bucket-label { font-size: 9px; } }",
  ".dsr-board__filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }",
  ".dsr-settings { min-width: 0; height: 100%; display: flex; flex-direction: column; background: var(--dsr-bg); color: var(--dsr-text); }",
  ".dsr-settings__head { display: flex; align-items: center; gap: 9px; padding: 16px 14px 12px; border-bottom: 1px solid var(--dsr-line-soft); flex: none; }",
  ".dsr-settings__mark { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-settings__headcopy { min-width: 0; flex: 1; }",
  ".dsr-settings__title { margin: 0; color: var(--dsr-text); font: var(--dsw-font-s-strong-14); letter-spacing: -.02em; }",
  ".dsr-settings__sub { margin: 2px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-settings__tabs { display: flex; gap: 3px; padding: 9px 12px; border-bottom: 1px solid var(--dsr-line-soft); flex: none; }",
  ".dsr-settings__tab { flex: 1; height: 28px; border: 0; border-radius: 7px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxs-strong-12); cursor: pointer; transition: background-color 140ms ease, color 140ms ease; }",
  ".dsr-settings__tab:hover { color: var(--dsr-text); background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-settings__tab.is-active { background: var(--dsr-soft); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .06); }",
  ".dsr-settings__tab:focus-visible, .dsr-settings__range-btn:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 1px; }",
  ".dsr-settings__body { flex: 1; min-height: 0; overflow: auto; padding: 13px 14px 18px; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-settings__section { display: flex; flex-direction: column; gap: 8px; animation: dsr-settings-in 180ms ease both; }",
  ".dsr-settings__section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
  ".dsr-settings__section-title { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-settings__badge { padding: 2px 6px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-settings__note { margin: 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 17px; }",
  ".dsr-settings__label { margin-top: 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .04em; }",
  ".dsr-settings .dsr-swatches, .dsr-settings .dsr-textures { padding: 0; gap: 5px; }",
  ".dsr-settings .dsr-swatch, .dsr-settings .dsr-texture-option { padding-top: 9px; padding-bottom: 8px; border-radius: 8px; }",
  ".dsr-settings .dsr-swatch__dot { width: 18px; height: 18px; }",
  ".dsr-settings__range { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin-top: 2px; }",
  ".dsr-settings__range-btn { height: 32px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }",
  ".dsr-settings__range-btn:hover { border-color: var(--dsr-line); color: var(--dsr-text); background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-settings__range-btn.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 36%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); color: var(--dsr-text); }",
  ".dsr-settings__hint { margin: 2px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 16px; }",
  ".dsr-settings__foot { display: flex; align-items: center; gap: 5px; padding: 10px 14px; border-top: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); flex: none; }",
  ".dsr-page__settings { display: none; min-width: 0; min-height: 0; overflow: hidden; border-left: 1px solid var(--dsr-line); background: var(--dsr-bg); }",
  ".dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr) minmax(320px, 380px); }",
  ".dsr-page__body.has-settings .dsr-page__settings { display: block; }",
  ".dsr-dock .dsr-prefs__menu--dock { inset: 0; width: auto; max-height: none; padding: 0; overflow: hidden; border-radius: inherit; background: var(--dsr-bg); box-shadow: none; }",
  ".dsr-dock .dsr-settings { height: 100%; }",
  ".dsr-dock .dsr-settings__head { padding: 13px 12px 10px; }",
  ".dsr-dock .dsr-settings__body { padding: 10px 12px 14px; }",
  ".dsr-dock .dsr-settings__note { display: block; }",
  "@keyframes dsr-settings-in { from { opacity: 0; transform: translateX(5px); } to { opacity: 1; transform: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-settings__section { animation: none; } }",
  "@container dsr-page (max-width: 1120px) { .dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr) minmax(300px, 350px); } }",
  "@container dsr-page (max-width: 900px) { .dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr); } .dsr-page__body.has-settings .dsr-page__list { display: none; } .dsr-page__body.has-settings .dsr-page__settings { display: block; border-left: 0; border-top: 1px solid var(--dsr-line); } }",
  "@media (max-width: 980px) { .dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr); } .dsr-page__body.has-settings .dsr-page__list { display: none; } .dsr-page__body.has-settings .dsr-page__settings { display: block; border-left: 0; border-top: 1px solid var(--dsr-line); } }",
  ".dsr-activity__bucket { position: relative; }",
  ".dsr-activity__tip { position: absolute; left: 50%; bottom: calc(100% + 7px); z-index: 8; width: max-content; min-width: 168px; display: flex; flex-direction: column; gap: 4px; padding: 9px 10px; border: 1px solid var(--dsr-line); border-radius: 9px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv3); color: var(--dsr-secondary); opacity: 0; visibility: hidden; transform: translate(-50%, 4px); transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease; pointer-events: none; text-align: left; }",
  ".dsr-activity__bucket[data-tip-align=\"start\"] .dsr-activity__tip { left: 0; transform: translate(0, 4px); }",
  ".dsr-activity__bucket[data-tip-align=\"end\"] .dsr-activity__tip { left: auto; right: 0; transform: translate(0, 4px); }",
  ".dsr-activity__bucket:hover .dsr-activity__tip, .dsr-activity__bucket:focus-visible .dsr-activity__tip { opacity: 1; visibility: visible; transform: translate(-50%, 0); }",
  ".dsr-activity__bucket[data-tip-align=\"start\"]:hover .dsr-activity__tip, .dsr-activity__bucket[data-tip-align=\"start\"]:focus-visible .dsr-activity__tip, .dsr-activity__bucket[data-tip-align=\"end\"]:hover .dsr-activity__tip, .dsr-activity__bucket[data-tip-align=\"end\"]:focus-visible .dsr-activity__tip { transform: translate(0, 0); }",
  ".dsr-activity__tip-title { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-activity__tip-row { display: flex; justify-content: space-between; gap: 18px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-activity__tip-row strong { color: var(--dsr-text); font-weight: 600; font-variant-numeric: tabular-nums; }",
  "@media (max-width: 680px) { .dsr-board__headmeta { width: 100%; min-width: 0; } .dsr-board__filters { width: 100%; } }",
  "@media (max-width: 560px) { .dsr-settings__range { grid-template-columns: minmax(0, 1fr); } .dsr-settings__tabs { padding-left: 10px; padding-right: 10px; } }",
  ".dsr-token__group-switch { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); }\n.dsr-token__group-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 25px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }\n.dsr-token__group-btn:hover { color: var(--dsr-text); }\n.dsr-token__group-btn.is-active { background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08); }\n.dsr-token__group-btn:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 48%, transparent); outline-offset: 1px; }\n.dsr-token__layout { display: grid; grid-template-columns: minmax(255px, .78fr) minmax(0, 1.3fr); align-items: stretch; gap: 20px; margin-top: 12px; }\n.dsr-token__pie-col { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 7px 20px 4px 4px; border-right: 1px solid var(--dsr-line-soft); }\n.dsr-token__pie { position: relative; width: 172px; height: 172px; flex: none; }\n.dsr-token__pie svg { display: block; width: 100%; height: 100%; }\n.dsr-token__pie-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; text-align: center; }\n.dsr-token__pie-center strong { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 20px; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }\n.dsr-token__pie-center small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }\n.dsr-token__legend { width: 100%; max-height: 132px; overflow-y: auto; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }\n.dsr-token__legend-row { min-width: 0; min-height: 26px; display: grid; grid-template-columns: 8px minmax(0, 1fr) auto 31px; align-items: center; gap: 8px; border-top: 1px solid var(--dsr-line-soft); }\n.dsr-token__legend-row:first-child { border-top: 0; }\n.dsr-token__dot { width: 8px; height: 8px; display: block; border-radius: 50%; }\n.dsr-token__legend-name { min-width: 0; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }\n.dsr-token__legend-value { color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }\n.dsr-token__legend-share { min-width: 31px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-align: right; }\n.dsr-token__bar-col { min-width: 0; display: flex; flex-direction: column; padding: 2px 2px 0 0; }\n.dsr-token__bar-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 19px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }\n.dsr-token__bar-head > span:first-child { color: var(--dsr-secondary); font-weight: 600; }\n.dsr-token__bar-total { font-variant-numeric: tabular-nums; white-space: nowrap; }\n.dsr-token__bars { position: relative; flex: 1; min-height: 202px; display: flex; align-items: stretch; padding: 16px 0 0; border-bottom: 1px solid var(--dsr-line-soft); }\n.dsr-token__grid { position: absolute; inset: 16px 0 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }\n.dsr-token__grid i { display: block; border-top: 1px dashed color-mix(in srgb, var(--dsr-line-soft) 82%, transparent); }\n.dsr-token__bar-list { position: relative; z-index: 1; width: 100%; display: flex; align-items: stretch; gap: 9px; padding: 0 3px; }\n.dsr-token__bar { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; padding: 0; border: 0; background: transparent; color: var(--dsr-muted); outline: none; }\n.dsr-token__bar-plot { width: 100%; flex: 1; display: flex; align-items: flex-end; justify-content: center; min-height: 0; }\n.dsr-token__bar-fill { display: block; width: min(31px, 74%); min-height: 3px; border-radius: 4px 4px 2px 2px; box-shadow: inset 0 1px rgba(255, 255, 255, .2); transition: height 280ms cubic-bezier(.2,.8,.2,1), filter 140ms ease; }\n.dsr-token__bar:hover .dsr-token__bar-fill, .dsr-token__bar:focus-visible .dsr-token__bar-fill { filter: saturate(1.15) brightness(1.05); }\n.dsr-token__bar:focus-visible .dsr-token__bar-plot { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 46%, transparent); outline-offset: 3px; border-radius: 4px; }\n.dsr-token__bar-label { width: 100%; min-height: 28px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding: 0 2px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 1.35; text-align: center; overflow-wrap: anywhere; }\n.dsr-token__bar.is-other .dsr-token__bar-label { color: var(--dsr-muted); }\n.dsr-token__axis { display: flex; align-items: center; gap: 8px; padding: 5px 3px 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }\n.dsr-token__axis span:last-child { margin-left: auto; }\n@media (max-width: 860px) { .dsr-token__layout { grid-template-columns: minmax(0, 1fr); gap: 14px; } .dsr-token__pie-col { flex-direction: row; justify-content: center; align-items: center; gap: 18px; padding: 2px 0 12px; border-right: 0; border-bottom: 1px solid var(--dsr-line-soft); } .dsr-token__pie { width: 150px; height: 150px; } .dsr-token__legend { flex: 1; min-width: 0; max-height: 112px; } .dsr-token__bar-col { padding: 0; } .dsr-token__bars { min-height: 180px; } }\n@media (max-width: 560px) { .dsr-token__pie-col { flex-direction: column; gap: 8px; padding: 0 0 10px; } .dsr-token__pie { width: 142px; height: 142px; } .dsr-token__legend { width: 100%; max-height: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; } .dsr-token__legend-row { min-height: 25px; } .dsr-token__bar-list { gap: 5px; padding: 0 1px; } .dsr-token__bars { min-height: 160px; } .dsr-token__bar-label { font-size: 10px; } .dsr-token__group-switch { width: 100%; } .dsr-token__group-btn { flex: 1; } }",
  `
/* quick launch rail: a compact, glassy companion to the radar entry */
.dsr-quickbar, .dsr-quickbar * { box-sizing: border-box; }
.dsr-quickbar { position: fixed; right: 8px; top: 204px; z-index: 57; transform: none; display: flex; flex-direction: column; align-items: stretch; gap: 5px; width: 48px; max-height: calc(100vh - 228px); overflow-x: hidden; overflow-y: auto; padding: 8px 6px; border: 1px solid var(--dsr-line); border-radius: 24px; background: var(--dsr-bg); background: color-mix(in srgb, var(--dsr-bg) 90%, transparent); box-shadow: var(--dsw-shadow-lv2); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); scrollbar-width: none; transition: width 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease, background-color 180ms ease; } .dsr-quickbar:hover, .dsr-quickbar:has(:focus-visible), .dsr-quickbar.is-near { width: 270px; box-shadow: var(--dsw-shadow-lv3); background: color-mix(in srgb, var(--dsr-bg) 96%, transparent); }
.dsr-quickbar.is-solo { right: 8px; top: 50%; transform: translateY(-50%); }
.dsr-quickbar::-webkit-scrollbar { display: none; }
.dsr-quickbar__cap { width: 100%; min-height: 26px; display: flex; align-items: center; padding: 0 0 4px; margin-bottom: 1px; border-bottom: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); flex: none; cursor: grab; touch-action: none; user-select: none; } .dsr-quickbar__cap:active, .dsr-quickbar.is-dragging .dsr-quickbar__cap { cursor: grabbing; } .dsr-quickbar.is-dragging { transition: none; } .dsr-quickbar__cap:hover .dsr-icon { color: var(--dsr-text); } .dsr-quickbar__cap .dsr-quickbar__glyph { width: 32px; height: 22px; } .dsr-quickbar__cap .dsr-quickbar__label { font: var(--dsw-font-xxxs-strong-11); letter-spacing: .08em; text-transform: uppercase; }
.dsr-quickbar__item { position: relative; display: flex; align-items: center; gap: 0; width: 100%; flex: none; } .dsr-quickbar__btn { position: relative; width: auto; min-width: 0; height: 34px; flex: 1 1 auto; padding: 0; display: flex; align-items: center; border: 1px solid transparent; border-radius: 10px; background: var(--dsr-soft); color: var(--dsr-secondary); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }
.dsr-quickbar__btn:hover { border-color: var(--dsr-line); background: color-mix(in srgb, var(--dsr-text) 6%, var(--dsr-soft)); color: var(--dsr-text); }
.dsr-quickbar__btn:active { background: color-mix(in srgb, var(--dsr-text) 10%, var(--dsr-soft)); }
.dsr-quickbar__btn:focus-visible, .dsr-quickbar__pin:focus-visible, .dsr-workspace-card__pin:focus-visible { outline: 2px solid var(--dsr-accent); outline-offset: 2px; }
.dsr-quickbar__btn.is-pinned { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); }
.dsr-quickbar__btn.is-live { color: var(--dsr-green); }
.dsr-quickbar__btn.is-live[data-status="approval"], .dsr-quickbar__btn.is-live[data-status="question"] { color: var(--dsr-amber); }
.dsr-quickbar__btn.is-review { border-color: color-mix(in srgb, var(--dsr-red) 30%, var(--dsr-line)); }
.dsr-quickbar__btn.is-stalled { color: var(--dsr-red); }
.dsr-quickbar__btn.is-stalled .dsr-quickbar__status { background: var(--dsr-red); }
.dsr-quickbar__btn.is-workspace { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-soft)); }
.dsr-quickbar__btn.is-more { color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); }
.dsr-quickbar__pin { width: 0; height: 34px; flex: none; display: grid; place-items: center; padding: 0; overflow: hidden; border: 0; border-radius: 9px; background: transparent; color: var(--dsr-muted); opacity: 0; pointer-events: none; cursor: pointer; transition: width 180ms cubic-bezier(.2,.8,.2,1), margin-left 180ms cubic-bezier(.2,.8,.2,1), opacity 140ms ease, color 140ms ease, background-color 140ms ease; } .dsr-quickbar:hover .dsr-quickbar__pin, .dsr-quickbar:has(:focus-visible) .dsr-quickbar__pin, .dsr-quickbar.is-near .dsr-quickbar__pin { width: 26px; margin-left: 4px; border: 1px solid transparent; opacity: 1; pointer-events: auto; } .dsr-quickbar__pin:hover { color: var(--dsr-text); background: color-mix(in srgb, var(--dsr-text) 8%, transparent); } .dsr-quickbar__pin.is-active { color: var(--dsr-accent); }
.dsr-quickbar__glyph { position: relative; width: 32px; height: 32px; flex: none; display: grid; place-items: center; } .dsr-quickbar__btn .dsr-icon { width: 17px; height: 17px; } .dsr-quickbar__copy { display: flex; flex-direction: column; justify-content: center; gap: 1px; min-width: 0; max-width: 0; padding-left: 0; overflow: hidden; opacity: 0; transform: translateX(-3px); transition: max-width 180ms cubic-bezier(.2,.8,.2,1), opacity 140ms ease, transform 180ms cubic-bezier(.2,.8,.2,1), padding-left 180ms cubic-bezier(.2,.8,.2,1); } .dsr-quickbar:hover .dsr-quickbar__copy, .dsr-quickbar:has(:focus-visible) .dsr-quickbar__copy, .dsr-quickbar.is-near .dsr-quickbar__copy { max-width: 184px; padding-left: 8px; opacity: 1; transform: none; } .dsr-quickbar__label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xxs-strong-12); letter-spacing: -.01em; color: var(--dsr-text); } .dsr-quickbar__item.is-current .dsr-quickbar__btn { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 44%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 11%, var(--dsr-soft)); box-shadow: inset 2px 0 0 var(--dsr-accent); } .dsr-quickbar__item.is-current .dsr-quickbar__label { color: var(--dsr-accent); } .dsr-quickbar__item.is-current .dsr-quickbar__status { background: var(--dsr-accent); } .dsr-quickbar__meta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); }
.dsr-quickbar__status { position: absolute; left: 3px; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.dsr-quickbar__alert { position: absolute; top: -2px; right: -2px; width: 7px; height: 7px; border: 1.5px solid var(--dsr-bg); border-radius: 50%; background: var(--dsr-red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-red) 12%, transparent); }
.dsr-quickbar__divider { width: 100%; height: 1px; flex: none; margin: 2px 0; background: var(--dsr-line); }
.dsr-quickpin-list { display: flex; flex-direction: column; gap: 5px; margin: 2px 0 13px; }
.dsr-quickpin { display: flex; align-items: center; gap: 8px; min-height: 38px; padding: 5px 5px 5px 8px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: var(--dsr-soft); }
.dsr-quickpin.is-pinned { border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-accent) 5%, var(--dsr-soft)); }
.dsr-quickpin__icon { width: 24px; height: 24px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-secondary); }
.dsr-quickpin__icon.is-workspace { color: var(--dsr-accent); }
.dsr-quickpin__copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.dsr-quickpin__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xxs-strong-12); }
.dsr-quickpin__meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-quickpin .dsr-icon-btn { width: 26px; height: 26px; flex: none; }
.dsr-workspace-card-slot { position: relative; display: flex; min-width: 0; }
.dsr-workspace-card-slot > .dsr-workspace-card { width: 100%; flex: 1; }
.dsr-workspace-card-slot .dsr-workspace-card__title { padding-right: 24px; }
.dsr-workspace-card-slot .dsr-workspace-card__arrow { display: none; }
.dsr-workspace-card__pin { position: absolute; top: 9px; right: 9px; z-index: 2; width: 26px !important; height: 26px !important; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: color-mix(in srgb, var(--dsr-bg) 84%, transparent); opacity: .72; }
.dsr-workspace-card__pin:hover, .dsr-workspace-card__pin.is-active { opacity: 1; }
.dsr-workspace-card__pin.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); }
@media (max-width: 720px) { .dsr-quickbar { top: auto; right: 8px; bottom: 72px; width: 44px; max-height: calc(100vh - 160px); padding: 6px 4px; border-radius: 22px; transform: none; } .dsr-quickbar:hover, .dsr-quickbar:has(:focus-visible), .dsr-quickbar.is-near { width: min(270px, calc(100vw - 24px)); } .dsr-quickbar.is-solo { right: 8px; top: auto; bottom: 16px; transform: none; } .dsr-quickbar__cap { min-height: 24px; } .dsr-quickbar__cap .dsr-quickbar__glyph { width: 30px; height: 20px; } .dsr-quickbar__btn { width: auto; height: 30px; flex: 1 1 auto; } .dsr-quickbar__glyph { width: 30px; height: 30px; } .dsr-quickbar__btn .dsr-icon { width: 16px; height: 16px; } }
@media (prefers-reduced-motion: reduce) { .dsr-quickbar, .dsr-quickbar__btn, .dsr-quickbar__copy { transition: none; } }
`
,
`
.dsr-page[data-card-texture="glass"] .dsr-card {
  background-color: color-mix(in srgb, var(--dsr-bg) 18%, transparent);
  background-image: none;
  -webkit-backdrop-filter: blur(32px) saturate(1.4);
  backdrop-filter: blur(32px) saturate(1.4);
  border-color: color-mix(in srgb, #fff 52%, var(--dsr-line));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), 0 1px 2px rgba(16,24,40,.04), 0 20px 38px -28px rgba(16,24,40,.32);
}
[data-ds-dark-theme] .dsr-page[data-card-texture="glass"] .dsr-card {
  background-color: color-mix(in srgb, var(--dsr-bg) 16%, transparent);
  border-color: color-mix(in srgb, #fff 24%, var(--dsr-line));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.09), 0 18px 36px -26px rgba(0,0,0,.9);
}
.dsr-page[data-card-texture="glass"] .dsr-card:hover {
  border-color: color-mix(in srgb, #fff 68%, var(--dsr-line));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.26), 0 24px 44px -28px rgba(16,24,40,.36);
}
.dsr-page[data-card-texture="glass"] .dsr-card::before { content: none; }
.dsr-texture-option__preview[data-texture="glass"] { background-color: color-mix(in srgb, var(--dsr-bg) 32%, transparent); background-image: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.5), 0 1px 4px rgba(16,24,40,.08); }

`,
`
/* ---------- v6: custom statistics window + conversation tree ---------- */
.dsr-rangebar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 11px; padding: 9px 10px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: color-mix(in srgb, var(--dsr-soft) 58%, transparent); }
.dsr-rangebar__field { display: inline-flex; align-items: center; gap: 5px; height: 27px; padding: 0 8px 0 9px; border: 1px solid var(--dsr-line); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-rangebar__field:focus-within { border-color: color-mix(in srgb, var(--dsr-accent) 46%, var(--dsr-line)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsr-accent) 12%, transparent); }
.dsr-rangebar__label { color: var(--dsr-muted); }
.dsr-rangebar__field input { height: 25px; min-width: 118px; border: 0; background: transparent; color: var(--dsr-text); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; outline: none; color-scheme: light dark; }
.dsr-rangebar__grains, .dsr-rangebar__quick { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-bg); }
.dsr-rangebar__grain, .dsr-rangebar__preset { height: 23px; min-width: 30px; padding: 0 7px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; transition: background-color 130ms ease, color 130ms ease; }
.dsr-rangebar__grain:hover, .dsr-rangebar__preset:hover { color: var(--dsr-text); background: color-mix(in srgb, var(--dsr-text) 6%, transparent); }
.dsr-rangebar__grain.is-active { background: var(--dsr-accent); color: var(--dsw-alias-label-primary-inverted); }
.dsr-rangebar__grain:focus-visible, .dsr-rangebar__preset:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 52%, transparent); outline-offset: 1px; }
.dsr-rangebar__resolved { margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dsr-wall__cell.is-outside { opacity: .26; }

.dsr-file-pill.is-change { gap: 5px; }
.dsr-file-pill__tool { flex: none; padding: 0 4px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); }
.dsr-tag { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }
@media (max-width: 560px) { .dsr-rangebar__resolved { margin-left: 0; white-space: normal; } .dsr-rangebar__field input { min-width: 104px; } }

/* ---- monitoring: stall, wait, throughput, tool cost ---------------------- */
.dsr-badge.is-alert { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 32%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-red) 7%, var(--dsr-bg)); }
.dsr-session-row.is-stalled .dsr-dot { background: var(--dsr-red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-red) 14%, transparent); animation: none; }
.dsr-card.is-stalled { --dsr-tone: var(--dsr-red); }
.dsr-card.is-stalled .dsr-card__live { border-color: color-mix(in srgb, var(--dsr-red) 24%, transparent); background: color-mix(in srgb, var(--dsr-red) 7%, transparent); }
.dsr-card.is-stalled .dsr-card__live .dsr-icon, .dsr-card.is-stalled .dsr-card__live .dsr-tool-glyph { color: var(--dsr-red); }
.dsr-stat[data-tone="red"] .dsr-stat__icon { color: var(--dsr-red); background: color-mix(in srgb, var(--dsr-red) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-red) 22%, var(--dsr-line-soft)); }
.dsr-page__stats .dsr-stat[data-tone="red"] .dsr-stat__icon { color: var(--dsr-red); background: none; border: 0; }

/* sort switch on the recent board */
.dsr-sort { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-muted); cursor: pointer; }
.dsr-sort:hover { border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line-soft)); color: var(--dsr-secondary); }
.dsr-sort .dsr-icon { flex: none; }
.dsr-sort__select { appearance: none; border: 0; background: transparent; color: inherit; font: var(--dsw-font-xxxs-11); padding: 0 1px; cursor: pointer; outline: none; }
.dsr-sort__select:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 1px; border-radius: 4px; }

/* tool cost table inside the detail panel */
.dsr-tools__row.is-other { color: var(--dsr-muted); }
.dsr-tools__row.is-other .dsr-tools__name { color: var(--dsr-muted); font-weight: 500; }
.dsr-tools__row.is-other .dsr-tools__bar i { background: color-mix(in srgb, var(--dsr-muted) 45%, transparent); }
@media (max-width: 400px) { .dsr-tools__row { grid-template-columns: minmax(0, 1fr) auto; } .dsr-tools__bar { display: none; } }

/* statistics: session time cost — wall-clock (merged) vs summed */
.dsr-time__summary { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 0 0 10px; }
.dsr-time__total { display: inline-flex; align-items: baseline; gap: 5px; padding: 2px 9px; border: 1px solid transparent; border-radius: 999px; color: var(--dsr-muted); font-variant-numeric: tabular-nums; }
.dsr-time__total strong { color: var(--dsr-secondary); font: var(--dsw-font-s-strong-14); }
.dsr-time__total small { font: var(--dsw-font-xxxs-11); }
.dsr-time__total.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); }
.dsr-time__total.is-active strong { color: var(--dsr-text); }
.dsr-time__total.is-muted strong { color: var(--dsr-muted); }
.dsr-time__hint { margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-time__rows { display: flex; flex-direction: column; gap: 4px; }
.dsr-time__row { display: grid; grid-template-columns: minmax(72px, 176px) minmax(0, 1fr) 62px; align-items: center; gap: 10px; padding: 3px 6px; border-radius: 7px; }
.dsr-time__row:hover { background: color-mix(in srgb, var(--dsr-text) 4%, transparent); }
.dsr-time__name { min-width: 0; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs); text-overflow: ellipsis; white-space: nowrap; }
.dsr-time__track { position: relative; height: 10px; border-radius: 5px; background: color-mix(in srgb, var(--dsr-text) 7%, transparent); overflow: hidden; }
.dsr-time__seg { position: absolute; top: 1px; bottom: 1px; border-radius: 3px; background: color-mix(in srgb, var(--dsr-accent) 72%, transparent); }
.dsr-time__row:hover .dsr-time__seg { background: var(--dsr-accent); }
.dsr-time__track.is-bar .dsr-time__seg { top: 2px; bottom: 2px; }
.dsr-time__value { color: var(--dsr-secondary); text-align: right; font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (max-width: 560px) {
  .dsr-time__row { grid-template-columns: minmax(0, 1fr) 58px; }
  .dsr-time__track { grid-column: 1 / -1; order: 3; margin-top: 3px; }
  .dsr-time__hint { margin-left: 0; flex-basis: 100%; }
}

/* ---- fullscreen session detail ------------------------------------------- */
.dsr-detail__scrim { position: fixed; inset: 0; z-index: 900; background: color-mix(in srgb, #05070d 60%, transparent); animation: dsr-fade 140ms ease-out; }
.dsr-detail.is-fullscreen { position: fixed; inset: 22px; z-index: 901; width: auto; max-width: none; height: auto; max-height: none; overflow: hidden; border: 1px solid var(--dsr-line); border-radius: 18px; background: var(--dsr-bg); box-shadow: 0 34px 90px -34px rgba(0, 0, 0, .55); animation: dsr-detail-in 170ms cubic-bezier(.2,.8,.2,1); }
.dsr-detail.is-fullscreen .dsr-detail__body { max-height: none; }
.dsr-dock:has(.dsr-detail.is-fullscreen) { -webkit-backdrop-filter: none; backdrop-filter: none; }
.dsr-detail.is-fullscreen .dsr-detail-stats { grid-template-columns: repeat(6, minmax(0, 1fr)); }
@keyframes dsr-detail-in { from { opacity: 0; transform: translateY(7px) scale(.996); } to { opacity: 1; transform: none; } }
@media (max-width: 760px) {
  .dsr-detail.is-fullscreen { inset: 8px; border-radius: 13px; }
  .dsr-detail.is-fullscreen .dsr-detail-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ---- round rail: jump straight to any round ----------------------------- */
.dsr-flip { transform: rotate(180deg); }

/* ---- branch relations --------------------------------------------------- */

/* ---- summarised rounds -------------------------------------------------- */

/* statistics: scope picker (workspaces / sessions) + collapsible time panel */
.dsr-scope__chips { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 11px; }
.dsr-scope__chip { display: inline-flex; align-items: center; gap: 5px; height: 25px; padding: 0 9px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-scope__chip small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-scope__chip:hover { border-color: color-mix(in srgb, var(--dsr-accent) 28%, var(--dsr-line)); color: var(--dsr-text); }
.dsr-scope__chip.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 46%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 12%, var(--dsr-bg)); color: var(--dsr-text); font-weight: 600; }
.dsr-scope__note { margin: 8px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-scope__picker { margin-top: 9px; padding: 9px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: var(--dsr-soft); }
.dsr-scope__search { width: 100%; height: 28px; padding: 0 9px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); }
.dsr-scope__search:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
.dsr-scope__list { display: flex; flex-direction: column; gap: 2px; max-height: 232px; margin-top: 7px; overflow-y: auto; }
.dsr-scope__row { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 5px 7px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); text-align: left; cursor: pointer; }
.dsr-scope__row:hover { background: color-mix(in srgb, var(--dsr-text) 5%, transparent); }
.dsr-scope__row.is-on { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 10%, var(--dsr-bg)); color: var(--dsr-text); }
.dsr-scope__row .dsr-icon { color: var(--dsr-muted); }
.dsr-scope__row.is-on .dsr-icon { color: var(--dsr-accent); }
.dsr-scope__row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-scope__row-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }
.dsr-time__toggle { border: 0; padding: 0; background: transparent; cursor: pointer; }
.dsr-time__toggle:hover { color: var(--dsr-accent); }
.dsr-time__toggle small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }
.dsr-activity__panel.is-collapsed { padding-bottom: 11px; }
.dsr-workspace-card-slot .dsr-workspace-card__stats { position: absolute; top: 9px; right: 41px; z-index: 2; width: 26px !important; height: 26px !important; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: color-mix(in srgb, var(--dsr-bg) 84%, transparent); opacity: .72; }
.dsr-workspace-card-slot .dsr-workspace-card__stats:hover { opacity: 1; }
/* Settings: the stall safety window is a number field, not a preset list. */
.dsr-settings__field { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px; padding: 7px 8px; border-radius: 7px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); }
.dsr-settings__field:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsr-settings__fieldlabel { color: var(--dsr-secondary); }
.dsr-settings__unit { display: flex; align-items: center; gap: 5px; }
.dsr-settings__num { width: 54px; height: 26px; padding: 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); font-variant-numeric: tabular-nums; text-align: right; }
.dsr-settings__num:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
.dsr-settings__suffix { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-settings__reset { height: 22px; padding: 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-settings__reset:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); }
/* Left sidebar strip: running, pinned and current sessions above the tree. */
.dsr-sidepins-host { display: flex; flex-direction: column; flex: none; min-height: 0; }
.dsr-sidepins { display: flex; flex-direction: column; padding: 5px var(--dsh-sidebar-inline-padding, 8px) 9px 2px; border-bottom: 1px solid color-mix(in srgb, var(--dsr-line-soft) 70%, transparent); }
.dsr-sidepins__head { display: flex; align-items: center; gap: 6px; padding: 0 2px 4px; }
.dsr-sidepins__toggle { display: inline-flex; align-items: center; gap: 5px; min-width: 0; padding: 3px 5px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .03em; cursor: pointer; }
.dsr-sidepins__toggle:hover { color: var(--dsr-text); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__toggle:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
.dsr-sidepins__toggle .dsr-icon { flex: none; opacity: .8; }
.dsr-sidepins__title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-sidepins__count { min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; background: color-mix(in srgb, var(--dsr-text) 8%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 17px; text-align: center; font-variant-numeric: tabular-nums; }
.dsr-sidepins__all { margin-left: auto; padding: 3px 5px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-sidepins__all:hover { color: var(--dsr-accent); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__hint { margin: 0 2px; padding: 3px 5px 1px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-sidepins__hint:hover { color: var(--dsr-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__list { display: flex; flex-direction: column; gap: 2px; }
.dsr-sidepins__row { display: flex; align-items: center; gap: 1px; border-radius: 8px; transition: background .12s ease; }
.dsr-sidepins__row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__row.is-current { background: color-mix(in srgb, var(--dsr-accent) 8%, transparent); }
.dsr-sidepins__main { display: flex; align-items: flex-start; gap: 8px; flex: 1 1 auto; min-width: 0; padding: 5px 7px; border: 0; border-radius: 8px; background: transparent; color: var(--dsr-secondary); text-align: left; cursor: pointer; }
.dsr-sidepins__main:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: -1px; }
.dsr-sidepins__dot { flex: none; width: 6px; height: 6px; margin-top: 6px; border-radius: 50%; background: var(--dsr-muted); }
.dsr-sidepins__dot.is-running, .dsr-sidepins__dot.is-tool { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 16%, transparent); }
.dsr-sidepins__dot.is-approval, .dsr-sidepins__dot.is-question { background: var(--dsr-amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-amber) 16%, transparent); }
.dsr-sidepins__dot.is-done { background: var(--dsr-green); }
.dsr-sidepins__dot.is-stalled { background: var(--dsr-red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-red) 18%, transparent); }
.dsr-sidepins__copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dsr-sidepins__line { display: flex; align-items: center; gap: 5px; min-width: 0; }
.dsr-sidepins__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-text); font: var(--dsw-font-xxs-12); line-height: 16px; }
.dsr-sidepins__flag { flex: none; height: 14px; padding: 0 4px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-accent) 14%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); line-height: 14px; }
.dsr-sidepins__flag.is-pin { background: color-mix(in srgb, var(--dsr-text) 8%, transparent); color: var(--dsr-muted); }
.dsr-sidepins__flag.is-review { background: color-mix(in srgb, var(--dsr-green) 15%, transparent); color: var(--dsr-green); }
.dsr-sidepins__meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 14px; }
.dsr-sidepins__row.is-stalled .dsr-sidepins__meta { color: var(--dsr-red); }
.dsr-sidepins__pin { flex: none; width: 24px; height: 24px; margin-right: 3px; display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); opacity: 0; cursor: pointer; transition: opacity .12s ease; }
.dsr-sidepins__row:hover .dsr-sidepins__pin, .dsr-sidepins__pin:focus-visible, .dsr-sidepins__pin.is-active { opacity: .85; }
.dsr-sidepins__pin.is-active { color: var(--dsr-accent); }
.dsr-sidepins__pin:hover { background: color-mix(in srgb, var(--dsr-text) 9%, transparent); }
.dsr-sidepins__row:hover .dsr-sidepins__pin:focus-visible { opacity: 1; }
.dsr-sidepins__more { margin-top: 3px; padding: 4px 7px; border: 0; border-radius: 7px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-align: left; cursor: pointer; }
.dsr-sidepins__more:hover { color: var(--dsr-accent); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins.is-collapsed { padding-bottom: 7px; }
/* Fork action on a round, and the lineage tree in the detail panel. */
.dsr-forknote { display: flex; align-items: center; gap: 7px; margin: 8px 0 2px; padding: 7px 9px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }
.dsr-forknote .dsr-icon { flex: none; color: var(--dsr-accent); }
.dsr-forknote.is-done { border-color: color-mix(in srgb, var(--dsr-green) 30%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-green) 8%, var(--dsr-bg)); }
.dsr-forknote.is-done .dsr-icon { color: var(--dsr-green); }
.dsr-forknote.is-error { border-color: color-mix(in srgb, var(--dsr-red) 32%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-red) 8%, var(--dsr-bg)); color: var(--dsr-text); }
.dsr-forknote.is-error .dsr-icon { color: var(--dsr-red); }
.dsr-forknote__text { flex: 1 1 auto; min-width: 0; }
.dsr-forknote__close { flex: none; width: 18px; height: 18px; display: grid; place-items: center; border: 0; border-radius: 5px; background: transparent; color: var(--dsr-muted); cursor: pointer; }
.dsr-forknote__close:hover { background: color-mix(in srgb, var(--dsr-text) 9%, transparent); color: var(--dsr-text); }
.dsr-forknote__open { flex: none; height: 20px; padding: 0 7px; border: 1px solid color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); border-radius: 6px; background: color-mix(in srgb, var(--dsr-accent) 8%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-forknote__open:hover { background: color-mix(in srgb, var(--dsr-accent) 16%, transparent); }
/* One click opens the side panel, two clicks blow it up: both get a small, cheap motion. */
@keyframes dsr-panel-in { from { opacity: 0; transform: translateY(4px) scale(.995); } to { opacity: 1; transform: none; } }
@keyframes dsr-full-in { from { opacity: 0; transform: scale(.985); } to { opacity: 1; transform: none; } }
@keyframes dsr-scrim-in { from { opacity: 0; } to { opacity: 1; } }
.dsr-detail { animation: dsr-panel-in .16s cubic-bezier(.2,.7,.2,1) both; transition: box-shadow .18s ease; }
.dsr-detail.is-fullscreen { animation: dsr-full-in .19s cubic-bezier(.2,.8,.2,1) both; will-change: transform, opacity; }
.dsr-detail__scrim { animation: dsr-scrim-in .16s ease-out both; }
.dsr-card, .dsr-row { transition: background-color .13s ease, transform .13s ease, border-color .13s ease; }
.dsr-card:active { transform: scale(.995); }
@media (prefers-reduced-motion: reduce) { .dsr-detail, .dsr-detail.is-fullscreen, .dsr-detail__scrim, .dsr-card, .dsr-row { animation: none !important; transition: none !important; } }
@media (max-width: 560px) { .dsr-scope__row-meta { display: none; } }

`,
`
/* Conversation tree: the right-Sidebar surface that carries a session's rounds,
   the branches cut from them, and the one small floating button that opens it. */
.dsr-cv { display: flex; flex-direction: column; gap: 8px; height: 100%; min-height: 0; overflow-y: auto; padding: 12px 10px 20px; color: var(--dsr-text); font-family: var(--dsw-font-family); scrollbar-gutter: stable; }
.dsr-cv, .dsr-cv * { box-sizing: border-box; }
.dsr-cv__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.dsr-cv__headcopy { min-width: 0; }
.dsr-cv__title { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--dsr-text); font: var(--dsw-font-s-strong-14); }
.dsr-cv__sub { margin: 3px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-cv__actions { display: flex; align-items: center; gap: 2px; flex: none; }
.dsr-cv__path { display: flex; flex-wrap: wrap; align-items: center; gap: 1px; }
.dsr-cv__crumb { max-width: 132px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 1px 5px; border: 0; border-radius: 5px; background: transparent; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-cv__crumb:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }
.dsr-cv__crumb.is-current { background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); color: var(--dsr-text); font-weight: 600; cursor: default; }
.dsr-cv__crumbsep { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-cv__notice { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }
.dsr-cv__notice.is-error { border-color: color-mix(in srgb, var(--dsr-red) 34%, var(--dsr-line)); color: var(--dsr-red); }
.dsr-cv__notice.is-done { border-color: color-mix(in srgb, var(--dsr-green) 34%, var(--dsr-line)); color: var(--dsr-green); }
.dsr-cv__noticetext { flex: 1 1 auto; min-width: 0; }
.dsr-cv__link { flex: none; padding: 0; border: 0; background: transparent; color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-cv__link:hover { text-decoration: underline; }
.dsr-cv__body { display: flex; flex-direction: column; gap: 2px; }
.dsr-cv__empty { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px dashed color-mix(in oklab, currentColor 20%, transparent); border-radius: 10px; }
.dsr-cv__hint { display: flex; align-items: center; gap: 8px; margin: 0; padding: 4px 8px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 1.6; }
.dsr-cv__hint.is-error { color: var(--dsr-red); }
.dsr-cv__node { display: flex; flex-direction: column; gap: 2px; }
.dsr-cv__noderow { display: flex; align-items: center; gap: 2px; border-radius: 7px; }
.dsr-cv__noderow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsr-cv__node.is-current > .dsr-cv__noderow { background: color-mix(in srgb, var(--dsr-accent) 9%, transparent); }
.dsr-cv__chev { flex: none; width: 18px; height: 22px; display: grid; place-items: center; border: 0; border-radius: 5px; background: transparent; color: var(--dsr-muted); cursor: pointer; }
.dsr-cv__chev:hover { color: var(--dsr-text); background: color-mix(in srgb, var(--dsr-text) 8%, transparent); }
.dsr-cv__nodetitle { display: flex; align-items: center; gap: 6px; flex: 1 1 auto; min-width: 0; height: 26px; padding: 0 5px; border: 0; border-radius: 6px; background: transparent; text-align: left; cursor: pointer; }
.dsr-cv__nodetitle:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: -1px; }
.dsr-cv__kind { flex: none; height: 15px; padding: 0 5px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-text) 7%, transparent); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 15px; }
.dsr-cv__kind.is-fork { background: color-mix(in srgb, var(--dsr-accent) 14%, transparent); color: var(--dsr-accent); }
.dsr-cv__kind.is-subagent { background: color-mix(in srgb, #4c7df0 16%, transparent); color: #3f6cd8; }
.dsr-cv__kind.is-root { background: color-mix(in srgb, var(--dsr-text) 10%, transparent); color: var(--dsr-secondary); }
.dsr-cv__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-text); font: var(--dsw-font-xxs-12); }
.dsr-cv__node.is-current > .dsr-cv__noderow .dsr-cv__name { font-weight: 600; }
.dsr-cv__current { flex: none; height: 14px; padding: 0 4px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-accent) 16%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); line-height: 14px; }
.dsr-cv__nodemeta { flex: none; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }
.dsr-cv__nodeact { flex: none; width: 22px; height: 22px; margin-right: 2px; display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); opacity: 0; cursor: pointer; }
.dsr-cv__noderow:hover .dsr-cv__nodeact, .dsr-cv__nodeact:focus-visible { opacity: .9; }
.dsr-cv__nodeact:hover { color: var(--dsr-red); background: color-mix(in srgb, var(--dsr-red) 12%, transparent); }
.dsr-cv__confirm { display: flex; flex-direction: column; gap: 7px; margin: 2px 0 4px 20px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--dsr-red) 32%, var(--dsr-line)); border-radius: 8px; background: color-mix(in srgb, var(--dsr-red) 7%, transparent); }
.dsr-cv__confirmtext { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 1.6; }
.dsr-cv__confirmrow { display: flex; gap: 6px; }
.dsr-cv__rounds { display: flex; flex-direction: column; gap: 1px; margin: 1px 0 2px 14px; padding-left: 7px; border-left: 1px solid var(--dsr-line-soft); }
.dsr-cv__round { display: flex; flex-direction: column; gap: 1px; }
.dsr-cv__roundrow { display: flex; align-items: center; gap: 5px; border-radius: 7px; }
.dsr-cv__roundrow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsr-cv__dot { flex: none; width: 6px; height: 6px; margin-left: 4px; border-radius: 50%; background: var(--dsr-muted); }
.dsr-cv__dot.is-done { background: var(--dsr-green); }
.dsr-cv__dot.is-running { background: var(--dsr-accent); animation: dsr-pulse 1.6s ease-in-out infinite; }
.dsr-cv__dot.is-error { background: var(--dsr-red); }
.dsr-cv__dot.is-open { background: var(--dsr-amber); }
.dsr-cv__roundmain { display: flex; align-items: baseline; gap: 6px; flex: 1 1 auto; min-width: 0; height: 24px; padding: 0 4px; border: 0; border-radius: 6px; background: transparent; text-align: left; cursor: pointer; }
.dsr-cv__roundmain:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: -1px; }
.dsr-cv__idx { flex: none; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; }
.dsr-cv__digest { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-cv__forkbtn { flex: none; display: flex; align-items: center; gap: 3px; height: 20px; padding: 0 6px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); opacity: .62; cursor: pointer; transition: opacity 130ms ease, background-color 130ms ease, color 130ms ease; }
.dsr-cv__roundrow:hover .dsr-cv__forkbtn, .dsr-cv__forkbtn.is-busy, .dsr-cv__forkbtn:focus-visible { opacity: 1; background: color-mix(in srgb, var(--dsr-accent) 11%, transparent); color: var(--dsr-accent); }
.dsr-cv__legend { margin: 12px 0 0; padding: 9px 2px 0; border-top: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 1.65; }
.dsr-cv__forkbtn:hover { background: color-mix(in srgb, var(--dsr-accent) 18%, transparent); color: var(--dsr-accent); }
.dsr-cv__forkbtn:disabled { opacity: .3; cursor: not-allowed; }
.dsr-cv__branchcount { display: inline-flex; align-items: center; gap: 2px; margin: -2px 0 2px 24px; color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); }
.dsr-cv__rounddetail { margin: 0 0 3px 22px; padding: 6px 8px; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-soft); }
.dsr-cv__prompt { margin: 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-wrap; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 1.65; }
.dsr-cv__prompt.is-empty { color: var(--dsr-muted); font-style: italic; }
.dsr-cv__roundmeta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-cv__roundmeta .is-error { color: var(--dsr-red); }
.dsr-cv__forknote { display: flex; align-items: center; gap: 5px; margin: 0 0 3px 22px; padding: 4px 7px; border-radius: 6px; background: var(--dsr-soft); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }
.dsr-cv__forknote.is-done { background: color-mix(in srgb, var(--dsr-green) 10%, transparent); color: var(--dsr-green); }
.dsr-cv__forknote.is-error { background: color-mix(in srgb, var(--dsr-red) 10%, transparent); color: var(--dsr-red); }
.dsr-cv__kids { display: flex; flex-direction: column; gap: 1px; margin: 1px 0 2px 18px; padding-left: 7px; border-left: 1px dashed color-mix(in srgb, var(--dsr-accent) 42%, transparent); }
.dsr-cv__loose { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
.dsr-cv__loosehead { padding: 2px 6px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
/* The floating entry: a small branch button in the conversation that expands to
   its label on hover and steps aside while the panel it opens is in front. */
.dsr-treefab { position: fixed; z-index: 56; pointer-events: auto; touch-action: none; user-select: none; right: 16px; bottom: min(96px, 18vh); display: flex; align-items: center; gap: 0; height: 32px; padding: 0 8px; border: 1px solid var(--dsr-line); border-radius: 16px; background: var(--dsr-bg); color: var(--dsr-secondary); box-shadow: var(--dsw-shadow-lv2); cursor: pointer; overflow: hidden; transition: color 140ms ease, border-color 140ms ease, transform 140ms ease, gap 140ms ease; }
.dsr-treefab:hover { gap: 5px; color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 40%, var(--dsr-line)); transform: translateY(-1px); }
.dsr-treefab:active { transform: translateY(0); }
.dsr-treefab.is-active { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); }
.dsr-treefab.is-dragging { transform: none; box-shadow: var(--dsw-shadow-lv3); cursor: grabbing; }
.dsr-treefab:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 2px; }
.dsr-treefab__glyph { display: grid; place-items: center; width: 16px; height: 16px; flex: none; }
.dsr-treefab__text { max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap; font: var(--dsw-font-xxxs-strong-11); transition: max-width 160ms ease, opacity 160ms ease; }
.dsr-treefab:hover .dsr-treefab__text, .dsr-treefab:focus-visible .dsr-treefab__text { max-width: 60px; opacity: 1; }
/* A round's own words: the instruction that opened it and the reply it drew,
   kept on screen so a branch reads as a conversation and not as a list. */
.dsr-cv__said { display: flex; flex-direction: column; gap: 1px; margin: 0 0 2px 22px; }
.dsr-cv__say { display: flex; align-items: flex-start; gap: 5px; margin: 0; min-width: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 16px; }
.dsr-cv__who { flex: none; height: 14px; margin-top: 1px; padding: 0 4px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-text) 7%, transparent); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 14px; }
.dsr-cv__say.is-user .dsr-cv__who { background: color-mix(in srgb, var(--dsr-accent) 12%, transparent); color: var(--dsr-accent); }
.dsr-cv__words { min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.dsr-cv__say.is-empty .dsr-cv__words { color: var(--dsr-muted); font-style: italic; }
.dsr-cv__state { flex: none; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-cv__state.is-running { color: var(--dsr-accent); }
.dsr-cv__state.is-error { color: var(--dsr-red); }
.dsr-cv__block { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dsr-cv__blocktitle { color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .02em; }
.dsr-cv__files { display: flex; flex-wrap: wrap; gap: 4px; }
.dsr-cv__tool { flex: none; height: 20px; padding: 0 8px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-cv__tool:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 32%, var(--dsr-line)); }
.dsr-cv__tool:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
/* Card seat: the same forest, tightened for a section instead of a panel. */
.dsr-cv__body.is-card { gap: 1px; }
.dsr-cv__body.is-card .dsr-cv__rounds { margin-left: 11px; }
.dsr-cv__body.is-card .dsr-cv__said { margin-left: 19px; }
.dsr-cv__body.is-card .dsr-cv__rounddetail { margin-left: 19px; }
.dsr-cv__body.is-card .dsr-cv__kids { margin-left: 15px; }
.dsr-cv__body.is-card .dsr-cv__legend { margin-top: 8px; }
/* The composer seat: one glyph in the row that also holds the submit action. */
.dsr-treetoggle { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsr-muted); cursor: pointer; transition: color 130ms ease, background-color 130ms ease, border-color 130ms ease; }
.dsr-treetoggle:hover { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); }
.dsr-treetoggle.is-active { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); }
.dsr-treetoggle:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
/* Long bodies fold to a readable slice and unfold on demand. */
.dsr-prose { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; max-width: 100%; }
.dsr-prose__text { margin: 0; max-height: 148px; overflow: auto; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 17px; white-space: pre-wrap; overflow-wrap: anywhere; }
.dsr-prose.is-open .dsr-prose__text { max-height: none; }
.dsr-prose__more { padding: 0; border: 0; background: transparent; color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-prose__more:hover { text-decoration: underline; }
@media (prefers-reduced-motion: reduce) {
  .dsr-treefab, .dsr-treefab__text, .dsr-cv__forkbtn, .dsr-treetoggle { transition: none; }
  .dsr-cv__dot.is-running { animation: none; }
}
`].join('\n');
