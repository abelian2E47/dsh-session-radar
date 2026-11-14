export const QUICK_NAV_CSS = `
/* Navigation inherits the host's surfaces, type and state palette. */
.dsr-qnav, .dsr-qnav * { box-sizing: border-box; }
.dsr-qnav { color: var(--dsr-text); font: var(--dsw-font-xxs-12); }
.dsr-qnav button, .dsr-qnav select, .dsr-qnav input { font: inherit; }
.dsr-qnav-buttons { position: fixed; z-index: 57; display: flex; align-items: center; gap: 6px; max-width: calc(100vw - var(--dsr-qnav-left) - 24px); flex-wrap: wrap; pointer-events: auto; }
.dsr-qnav-buttons.is-top-left, .dsr-qnav-buttons.is-custom { left: var(--dsr-qnav-left); top: var(--dsr-qnav-top); }
.dsr-qnav-buttons.is-top-right { right: 64px; top: var(--dsr-qnav-top); }
.dsr-qnav-buttons.is-bottom-left { left: var(--dsr-qnav-left); bottom: 28px; }
.dsr-qnav-buttons.is-bottom-right { right: 64px; bottom: 28px; }
.dsr-qnav-control, .dsr-qnav-more { flex: none; width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-secondary); padding: 0; cursor: pointer; }
.dsr-qnav-control:hover, .dsr-qnav-more:hover { color: var(--dsr-text); background: var(--dsr-soft); }
.dsr-qnav-control:disabled { opacity: .45; cursor: default; }
.dsr-qnav button:focus-visible, .dsr-qnav select:focus-visible, .dsr-qnav input:focus-visible, .dsr-qnav-options button:focus-visible, .dsr-qnav-alias:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 2px; }
.dsr-qnav-grip { width: 18px; height: 34px; display: grid; place-items: center; color: var(--dsr-muted); cursor: grab; touch-action: none; }
.dsr-qnav-grip:active { cursor: grabbing; }
.dsr-qnav-popover { position: absolute; z-index: 60; top: calc(100% + 10px); left: 0; width: min(326px, calc(100vw - 24px)); padding: 12px; border: 1px solid var(--dsr-line); border-radius: 12px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv3); max-height: min(600px, calc(100vh - 180px)); overflow: auto; scrollbar-width: thin; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }
.dsr-qnav-buttons.is-top-right .dsr-qnav-popover, .dsr-qnav-buttons.is-bottom-right .dsr-qnav-popover { left: auto; right: 0; }
.dsr-qnav-buttons.is-bottom-left .dsr-qnav-popover, .dsr-qnav-buttons.is-bottom-right .dsr-qnav-popover { top: auto; bottom: calc(100% + 10px); }
.dsr-qnav-head { display: flex; align-items: center; gap: 8px; min-height: 28px; padding-bottom: 9px; border-bottom: 1px solid var(--dsr-line-soft); }
.dsr-qnav-head strong { margin-right: auto; font: var(--dsw-font-xs-strong-13); }
.dsr-qnav-options { display: flex; flex-direction: column; gap: 14px; padding: 12px 0 4px; color: var(--dsr-text); }
.dsr-qnav-modes { display: flex; padding: 3px; gap: 3px; background: var(--dsr-soft); border-radius: 8px; }
.dsr-qnav-modes button { flex: 1; min-height: 32px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dsr-secondary); cursor: pointer; padding: 4px 7px; font: var(--dsw-font-xxs-12); white-space: nowrap; }
.dsr-qnav-modes button[aria-pressed=true] { color: var(--dsr-text); background: var(--dsr-bg); border-color: var(--dsr-line); }
.dsr-qnav-field { display: flex; align-items: center; justify-content: space-between; gap: 12px; font: var(--dsw-font-xxs-12); }
.dsr-qnav-field select, .dsr-qnav-field input[type=number], .dsr-qnav-alias { min-width: 0; max-width: 180px; border: 1px solid var(--dsr-line); border-radius: 6px; padding: 6px 8px; background: var(--dsr-soft); color: var(--dsr-text); font: var(--dsw-font-xxs-12); }
.dsr-qnav-field input[type=number] { width: 62px; }
.dsr-qnav-field input[type=checkbox] { accent-color: var(--dsr-accent); }
.dsr-qnav-alias { width: 44px; padding: 5px; text-align: center; flex: none; }
.dsr-qnav-link { width: fit-content; padding: 3px 0; border: 0; background: transparent; color: var(--dsr-accent); cursor: pointer; text-align: left; font: var(--dsw-font-xxs-12); }
.dsr-qnav-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.dsr-qnav-link:disabled { color: var(--dsr-muted); cursor: default; }
.dsr-qnav-hint { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 1.65; }
.dsr-qnav-trigger { position: fixed; z-index: 60; pointer-events: auto; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-secondary); cursor: pointer; padding: 8px; }
.dsr-qnav-trigger.is-right { right: 0; top: max(140px, 38vh); flex-direction: column; width: 34px; min-height: 126px; border-radius: 9px 0 0 9px; box-shadow: var(--dsw-shadow-lv2); }
.dsr-qnav-trigger.is-right .dsr-qnav-trigger__label { writing-mode: vertical-rl; letter-spacing: 2px; }
.dsr-qnav-trigger.is-open { visibility: hidden; pointer-events: none; }
.dsr-qnav-trigger.is-sidebar-bottom { left: 12px; bottom: 52px; width: min(var(--dsr-qnav-sidebar-width), calc(100vw - 24px)); height: 30px; }
.dsr-qnav-trigger:hover { color: var(--dsr-accent); }
.dsr-qnav-panel { position: fixed; z-index: 58; width: min(352px, calc(100vw - 24px)); border: 1px solid var(--dsr-line); border-radius: 14px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv3); padding: 13px; pointer-events: auto; display: flex; flex-direction: column; max-height: calc(100vh - 156px); animation: dsr-qnav-enter 160ms cubic-bezier(.16,1,.3,1); }
.dsr-qnav-panel.is-right { right: 0; top: max(12px, calc(var(--dsh-frame-top-clearance, 0px) + 8px)); bottom: 8px; width: min(460px, calc(100vw - 20px)); max-height: none; border-radius: 16px 0 0 16px; padding: 20px; z-index: 60; animation-name: dsr-qnav-sidebar-enter; }
.dsr-qnav-panel.is-right .dsr-qnav-head { flex: none; min-height: 40px; padding-bottom: 14px; }
.dsr-qnav-panel.is-right .dsr-qnav-head strong { font: var(--dsw-font-s-strong-14); }
.dsr-qnav-panel.is-right .dsr-qnav-panel__body { flex: 1; padding: 10px 0 14px; }
.dsr-qnav-panel.is-right .dsr-qnav-card { margin: 9px 0; border-radius: 12px; }
.dsr-qnav-panel.is-right .dsr-qnav-card__main { gap: 13px; padding: 16px 12px; }
.dsr-qnav-panel.is-right .dsr-qnav-card__identity { width: 40px; height: 40px; }
.dsr-qnav-panel.is-right .dsr-qnav-card__copy { gap: 6px; }
.dsr-qnav-panel.is-right .dsr-qnav-card__copy strong { font: var(--dsw-font-xs-strong-13); }
.dsr-qnav-panel.is-right .dsr-qnav-foot { flex: none; padding-top: 14px; }
.dsr-qnav-panel.is-sidebar-bottom { left: 12px; bottom: 88px; width: min(var(--dsr-qnav-sidebar-width), calc(100vw - 24px)); }
.dsr-qnav-panel__body { overflow: auto; min-height: 0; padding: 6px 0; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }
.dsr-qnav-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid var(--dsr-line-soft); padding-top: 10px; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }
.dsr-qnav-card { display: flex; align-items: center; min-width: 0; border: 1px solid var(--dsr-line); border-radius: 9px; margin: 6px 0; background: var(--dsr-soft); padding: 3px 5px 3px 0; }
.dsr-qnav-card:hover { border-color: var(--dsr-muted); }
.dsr-qnav-card.is-current { border-color: var(--dsr-accent); }
.dsr-qnav-card__main { flex: 1; display: flex; gap: 10px; min-width: 0; padding: 10px; border: 0; background: transparent; color: var(--dsr-text); text-align: left; cursor: pointer; }
.dsr-qnav-card__identity { width: 32px; height: 32px; flex: none; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-bg); display: grid; place-items: center; font: var(--dsw-font-xxs-strong-12); }
.dsr-qnav-card__copy { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dsr-qnav-card__copy strong { font: var(--dsw-font-xxs-strong-12); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.dsr-qnav-card__meta { color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-qnav-status { display: flex; align-items: center; gap: 4px; font: var(--dsw-font-xxxs-11); color: var(--dsr-secondary); }
.dsr-qnav-card[data-status=running] .dsr-qnav-status, .dsr-qnav-card[data-status=tool] .dsr-qnav-status { color: var(--dsr-green); }
.dsr-qnav-card[data-status=approval] .dsr-qnav-status, .dsr-qnav-card[data-status=question] .dsr-qnav-status { color: var(--dsr-amber); }
.dsr-qnav-card[data-stalled=true] .dsr-qnav-status { color: var(--dsr-red); }
.dsr-qnav-workspace { min-width: 0; }
.dsr-qnav-group { display: flex; align-items: center; gap: 7px; width: 100%; padding: 9px 3px 5px; border: 0; background: transparent; color: var(--dsr-secondary); text-align: left; cursor: pointer; font: var(--dsw-font-xxxs-strong-11); }
.dsr-qnav-group > span:first-of-type { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-qnav-group:hover { color: var(--dsr-text); }
.dsr-qnav-group__count { color: var(--dsr-secondary); font-variant-numeric: tabular-nums; }
.dsr-qnav-group__signal { display: grid; place-items: center; margin-left: auto; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 4px; color: var(--dsr-green); background: color-mix(in srgb, var(--dsr-green) 10%, var(--dsr-bg)); }
.dsr-qnav-group__signal.is-waiting { color: var(--dsr-amber); background: color-mix(in srgb, var(--dsr-amber) 10%, var(--dsr-bg)); }
.dsr-qnav-group.is-compact { width: auto; max-width: 150px; height: 34px; padding: 5px 8px; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-bg); gap: 5px; }
.dsr-qnav-iconwrap { position: relative; display: inline-flex; }
.dsr-qnav-icon { width: 38px; height: 34px; padding: 0; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-text); display: grid; place-items: center; position: relative; cursor: pointer; }
.dsr-qnav-icon:hover { background: var(--dsr-soft); border-color: var(--dsr-muted); }
.dsr-qnav-icon.is-current { border-color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 10%, var(--dsr-bg)); }
.dsr-qnav-icon__name { font: var(--dsw-font-xxs-strong-12); padding-bottom: 2px; }
.dsr-qnav-icon__status { position: absolute; right: -3px; bottom: -3px; display: grid; place-items: center; width: 15px; height: 15px; border: 1px solid var(--dsr-line); border-radius: 5px; background: var(--dsr-bg); color: var(--dsr-secondary); }
.dsr-qnav-icon[data-status=running] .dsr-qnav-icon__status, .dsr-qnav-icon[data-status=tool] .dsr-qnav-icon__status { color: var(--dsr-green); }
.dsr-qnav-icon[data-status=approval] .dsr-qnav-icon__status, .dsr-qnav-icon[data-status=question] .dsr-qnav-icon__status { color: var(--dsr-amber); }
.dsr-qnav-icon[data-stalled=true] .dsr-qnav-icon__status { color: var(--dsr-red); }
.dsr-qnav-icon__mark { position: absolute; top: -5px; left: -4px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); font-size: 8px; line-height: 10px; border-radius: 3px; padding: 0 2px; }
.dsr-qnav-icon__unread { position: absolute; top: -3px; right: -3px; width: 6px; height: 6px; background: var(--dsr-red); border-radius: 50%; }
.dsr-qnav-tooltip { display: none; position: absolute; top: calc(100% + 9px); left: 0; width: max-content; max-width: min(280px, calc(100vw - 32px)); padding: 9px 11px; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv2); pointer-events: none; z-index: 61; overflow-wrap: anywhere; }
.dsr-qnav-tooltip strong { display: block; font: var(--dsw-font-xxs-strong-12); }
.dsr-qnav-tooltip > span { display: block; margin-top: 4px; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }
.dsr-qnav-iconwrap:hover .dsr-qnav-tooltip, .dsr-qnav-iconwrap:focus-within .dsr-qnav-tooltip { display: block; }
.dsr-qnav-buttons.is-top-right .dsr-qnav-tooltip, .dsr-qnav-buttons.is-bottom-right .dsr-qnav-tooltip { left: auto; right: 0; }
.dsr-qnav-buttons.is-bottom-left .dsr-qnav-tooltip, .dsr-qnav-buttons.is-bottom-right .dsr-qnav-tooltip { top: auto; bottom: calc(100% + 9px); }
.dsr-qnav-empty { padding: 22px 8px; line-height: 1.7; }
.dsr-qnav-empty strong { font: var(--dsw-font-xs-strong-13); }
.dsr-qnav-empty p { margin: 7px 0; color: var(--dsr-secondary); }
.dsr-qnav-overflow { max-height: min(500px, calc(100vh - 180px)); }
.dsr-qnav ::selection { background: color-mix(in srgb, var(--dsr-accent) 22%, transparent); color: var(--dsr-text); }
.dsr-qnav input { caret-color: var(--dsr-accent); }
@keyframes dsr-qnav-enter { from { transform: translateY(5px); } to { transform: translateY(0); } }
@keyframes dsr-qnav-sidebar-enter { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (max-width: 720px) {
  .dsr-qnav-buttons { max-width: calc(100vw - 24px); }
  .dsr-qnav-buttons.is-top-left, .dsr-qnav-buttons.is-custom { left: 12px; top: calc(var(--dsh-frame-top-clearance, 0px) + 98px); }
  .dsr-qnav-buttons.is-top-right { right: 12px; top: calc(var(--dsh-frame-top-clearance, 0px) + 98px); }
  .dsr-qnav-buttons.is-bottom-left { left: 12px; }
  .dsr-qnav-buttons.is-bottom-right { right: 12px; }
  .dsr-qnav-trigger.is-sidebar-bottom { width: 100px; }
  .dsr-qnav-popover { max-height: calc(100vh - 220px); }
  .dsr-qnav-icon, .dsr-qnav-control, .dsr-qnav-more { min-height: 36px; }
}
@media (prefers-reduced-motion: reduce) { .dsr-qnav-panel { animation: none; } }
`;
