#!/usr/bin/env node
/**
 * Concatenate the framework-free core, the data controller, the CSS, and the
 * React surfaces into the single ModuleLoader bundle DSH serves to the Web
 * client. No bundler is needed because React is the only platform seed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function stripExports(source) {
  return source.replace(/^export\s+/gm, '');
}

const core = stripExports(readFileSync(join(root, 'src', 'core.mjs'), 'utf8'));
const quicknav = stripExports(readFileSync(join(root, 'src', 'quicknav.mjs'), 'utf8'));
const quicknavUi = readFileSync(join(root, 'src', 'quicknav-ui.js'), 'utf8');
const quicknavStyles = stripExports(readFileSync(join(root, 'src', 'quicknav-styles.mjs'), 'utf8'));
const styles = stripExports(readFileSync(join(root, 'src', 'styles.mjs'), 'utf8'));
const controller = stripExports(readFileSync(join(root, 'src', 'controller.mjs'), 'utf8'));
const ui = readFileSync(join(root, 'src', 'ui.js'), 'utf8');

const bundle = [
  'window.__ModuleLoader__.load({',
  "  id: 'dsh-session-manager',",
  '  factory: (require) => {',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
  "    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });",
  "    const React = require('react');",
  '    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React;',
  '    const h = React.createElement;',
  '    const Fragment = React.Fragment;',
  '    // The left sidebar strip portals into the host workspace column; a host',
  '    // without the react-dom seed simply keeps the strip unrendered.',
  '    let ReactDOM = null;',
  '    try { ReactDOM = require(\'react-dom\'); } catch (error) { ReactDOM = null; }',
  '    const createPortal = ReactDOM && typeof ReactDOM.createPortal === \'function\' ? ReactDOM.createPortal : null;',
  '',
  '    // ---- core -------------------------------------------------------------',
  core,
  quicknav,
  quicknavStyles,
  '',
  '    // ---- styles -----------------------------------------------------------',
  styles,
  '',
  '    // ---- controller -------------------------------------------------------',
  controller,
  '',
  '    // ---- React surfaces ---------------------------------------------------',
  ui,
  quicknavUi,
  '',
  '    exports.apply = apply;',
  '    exports.inject = inject;',
  '    if (globalThis.__DSR_TEST__ === true) exports.__components = { Dock, SidebarPins, SidebarPinRow, QuickBar, QuickNavigation, QuickNavOptions, RadarPage, DetailPanel, SessionRow, PrefsMenu, EmptyRadar, UsageView, ActivityView, PageSearchView, SearchResultsPanel, SessionCard, WorkspaceBoard, HistorySessionCard, BulkBar, SessionTreeSection, SessionTree, TreeSessionNode, TreeRoundRow, TreePanel, TreeFab, TreeComposerButton, PrefsSidebar, RadarController };',
  '    return module.exports;',
  '  },',
  '});',
  '',
].join('\n');

mkdirSync(join(root, 'lib'), { recursive: true });
writeFileSync(join(root, 'lib', 'client.js'), bundle, 'utf8');
console.log('built lib/client.js:', bundle.length, 'bytes');
