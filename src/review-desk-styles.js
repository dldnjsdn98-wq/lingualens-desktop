// Final workbench layer. Keep the old standalone layout intact; all desk tokens live here.
export const reviewDeskStyles=String.raw`
.workbench{
 --desk-frame:#eceeea;--desk-sheet:#ffffff;--desk-white:#fff;--desk-raised:#f4f5f1;
 --desk-canvas:#dce1e2;--desk-ink:#263d47;--desk-muted:#59686c;--desk-faint:#657175;
 --desk-line:#e0e4e0;--desk-control:#bfc8c7;--desk-hover:#e4e8e4;
 --desk-selection:#e8f0f3;--desk-blue:#2f6685;--desk-good:#226b50;--desk-good-bg:#e6f2eb;
 --desk-bad:#a23545;--desk-bad-bg:#faecee;--desk-warn:#865d18;--desk-warn-bg:#faf1dc;
 --ink:var(--desk-ink);--muted:var(--desk-muted);--line:var(--desk-line);
 --brand:var(--desk-ink);--brand2:var(--desk-ink);--good:var(--desk-good);--bad:var(--desk-bad);--warn:var(--desk-warn);
 background:var(--desk-frame);color:var(--desk-ink);font-family:'Segoe UI','Malgun Gothic',system-ui,sans-serif;
 font-size:14px;line-height:1.5;accent-color:var(--desk-blue);caret-color:var(--desk-blue);
 scrollbar-color:var(--desk-control) transparent;scrollbar-width:thin
}
.workbench ::selection{background:var(--desk-selection);color:var(--desk-ink)}
.workbench *, .workbench *::before,.workbench *::after{scrollbar-color:var(--desk-control) transparent}
.workbench button{border:1px solid var(--desk-control);border-radius:6px;background:var(--desk-white);color:var(--desk-ink);box-shadow:none;transition:background-color .15s,border-color .15s}
.workbench button:hover:not(:disabled){background:var(--desk-hover);border-color:var(--desk-muted);transform:none}
.workbench button:disabled{opacity:.65}
.workbench button.secondary{background:var(--desk-raised);color:var(--desk-ink);border-color:var(--desk-control)}
.workbench button.ghost{background:transparent;color:var(--desk-muted);border-color:var(--desk-control)}
.workbench button.danger{background:var(--desk-bad-bg);color:var(--desk-bad);border-color:var(--desk-bad-bg)}
.workbench :is(button,input,textarea,select,summary,a):focus-visible,.workbench .panel-grip:focus-visible{outline:2px solid var(--desk-blue);outline-offset:3px}
.workbench :is(input,textarea,select){color:var(--desk-ink);background:var(--desk-white);border:1px solid var(--desk-control);border-radius:6px;box-shadow:none}
.workbench :is(input,textarea)::placeholder{color:var(--desk-faint);opacity:1}
.workbench :is(input,textarea,select):focus{border-color:var(--desk-blue);box-shadow:none}
.workbench :is(.help,.reason,.result-meta,.analysis-detail,.region-status){color:var(--desk-muted)}
.workbench .topbar{height:60px;min-height:60px;padding:0 16px;gap:16px;background:var(--desk-frame);border:0;box-shadow:none;color:var(--desk-ink)}
.workbench .brand{gap:9px;color:var(--desk-ink)}
.workbench .brand b{font-size:15px;font-weight:650;letter-spacing:-.025em}
.workbench .brand small{color:var(--desk-muted);font-size:11px}
.workbench .brand-mark{width:30px;height:30px;border-radius:0;background:none;color:var(--desk-blue);box-shadow:none}
.workbench .brand-mark svg{display:block;width:30px;height:30px}
.workbench .top-status,.workbench .top-status>span{color:var(--desk-muted);font-size:12px}
.workbench .workbench-provider select{height:34px;padding:5px 8px;background:var(--desk-raised)}
.workbench .chip{background:var(--desk-raised);color:var(--desk-muted);border:1px solid var(--desk-line);border-radius:4px;font-size:11px}
.workbench #versionCheck{color:var(--desk-muted);font-size:11px;border:0}
.workbench .save-indicator{color:var(--desk-good);font-size:11px}
.workbench .save-indicator[data-state=draft]{color:var(--desk-warn)}
.workbench .save-indicator[data-state=error]{color:var(--desk-bad)}
/* At 1440: 224 queue + 848 canvas + 360 results + 8 outer inset = 1440.
   Resizing changes the two CSS widths; the middle column absorbs the difference. */
.workbench .workbench-shell{height:calc(100dvh - 68px);margin:0 8px 8px 0;gap:0;grid-template-columns:var(--left-width,224px) minmax(0,1fr) var(--right-width,360px)}
.workbench .card.workspace-card{background:var(--desk-frame);border:0;padding:16px}
.workbench .workspace-card .head{margin-bottom:14px}
.workbench .workspace-card h2{font-size:15px;font-weight:650}
.workbench .workspace-info{border-color:var(--desk-control);padding:8px 0;margin:8px 0 12px}
.workbench .workspace-info>summary{color:var(--desk-muted)}
.workbench .image-navigation{gap:8px;margin:12px 0}
.workbench .image-navigation :is(input,select){min-height:34px;font-size:12px}
.workbench .queue-item{border:1px solid var(--desk-line);border-left-width:1px;border-radius:6px;background:var(--desk-raised);padding-top:8px;padding-bottom:28px}
.workbench .queue-item:has(.image-tab.active){border-color:var(--desk-blue);border-left-color:var(--desk-blue);box-shadow:none;background:var(--desk-selection)}
.workbench .image-tab,.workbench .image-tab.active{background:transparent;color:var(--desk-ink);border:0;border-radius:4px;box-shadow:none}
.workbench .image-tab{gap:4px 8px}
.workbench .image-tab small{color:var(--desk-muted);font-size:11px}
.workbench .queue-thumb{background:var(--desk-canvas);border-radius:3px}
.workbench .queue-handle{color:var(--desk-muted)}
.workbench .queue-item:is([data-state=review],[data-state=issue],[data-state=fail],[data-state=pass],[data-state=accepted]){border-left-width:1px;border-left-color:var(--desk-line)}
.workbench .queue-item:has(.image-tab.active){border-left-color:var(--desk-blue)}
.workbench .queue-item[data-state=review] small{color:var(--desk-warn)}
.workbench .queue-item:is([data-state=issue],[data-state=fail]) small{color:var(--desk-bad)}
.workbench .queue-item:is([data-state=pass],[data-state=accepted]) small{color:var(--desk-good)}
.workbench #batchReadiness{background:var(--desk-raised);color:var(--desk-muted);border-color:var(--desk-control)}
.workbench .workspace-more>summary{color:var(--desk-muted)}
.workbench .workbench-center{border:1px solid var(--desk-line);border-right:0;border-radius:16px 0 0 16px;overflow:hidden;background:var(--desk-sheet)}
.workbench .preview-card{background:var(--desk-canvas)}
.workbench .preview-card>.head{background:var(--desk-sheet);height:58px;min-height:58px;border-bottom:1px solid var(--desk-line);padding:10px 16px}
.workbench .desk-title{font-size:16px;line-height:1.4;font-weight:650;letter-spacing:-.025em;margin:0}
.workbench #fileMeta{color:var(--desk-muted);background:none;border:0}
.workbench .layout-switch button{color:var(--desk-muted);background:transparent;border:0;border-radius:0;min-height:30px;font-size:11px}
.workbench .layout-switch button[aria-pressed=true]{color:var(--desk-ink);background:transparent;border:0;box-shadow:inset 0 -2px var(--desk-ink)}
.workbench .canvas-toolbar{background:var(--desk-sheet);color:var(--desk-muted);border-color:var(--desk-line);padding:8px 12px;min-height:48px}
.workbench .tool-button{background:var(--desk-white);color:var(--desk-muted);border:1px solid var(--desk-control);border-radius:5px;font-size:11px;min-height:30px}
.workbench .tool-button[aria-pressed=true]{background:var(--desk-hover);color:var(--desk-ink);border-color:var(--desk-muted)}
.workbench .zoom-tools output{font-size:11px;color:var(--desk-muted);font-variant-numeric:tabular-nums}
.workbench .canvas-viewport{background:var(--desk-canvas);background-image:none}
.workbench .dropzone{background:var(--desk-sheet);border:1px dashed var(--desk-control);border-radius:10px;min-height:260px;color:var(--desk-ink)}
.workbench .upload-icon{background:transparent;color:var(--desk-muted);box-shadow:none}
.workbench .dropzone-copy>span{color:var(--desk-muted)}
.workbench .region-box,.workbench .region-box.active{border-color:var(--desk-blue);background:#2f668514}
.workbench .region-box>span{background:var(--desk-blue);color:var(--desk-white)}
.workbench .region-handle{border-color:var(--desk-blue)}
.workbench .image-minimap{border-color:var(--desk-sheet)!important;box-shadow:none!important;border-radius:5px!important;background:var(--desk-canvas)!important}
.workbench .image-minimap span{border-color:var(--desk-blue);background:#2f668514}
.workbench .workbench-right{background:var(--desk-sheet);border:1px solid var(--desk-line);border-radius:0 16px 16px 0;overflow:hidden}
.workbench .workbench-tabs{height:58px;min-height:58px;padding:8px 16px 0;gap:20px;border-color:var(--desk-line)}
.workbench .workbench-tabs button{flex:none;padding:8px 1px 12px;background:transparent;color:var(--desk-muted);border:0;border-radius:0;font-size:13px}
.workbench .workbench-tabs button[aria-selected=true]{background:transparent;color:var(--desk-ink);box-shadow:inset 0 -2px var(--desk-ink)}
.workbench .card,.workbench .review-filters{background:var(--desk-sheet)}
.workbench .entry{border-color:var(--desk-line);border-radius:6px;box-shadow:none}
.workbench .entry-head{background:var(--desk-raised);border-color:var(--desk-line)}
.workbench .entry-body{background:var(--desk-sheet);padding:12px}
.workbench .phrase-foot{border-color:var(--desk-line);color:var(--desk-muted)}
.workbench .review-overview{background:var(--desk-raised);border-color:var(--desk-line);padding:10px 14px;max-height:126px}
.workbench .review-overview .summary{background:transparent;color:var(--desk-ink)}
.workbench .review-overview .summary strong{font-size:14px;font-weight:650}
.workbench .analysis-detail{font-size:11px;color:var(--desk-muted)}
.workbench .results-card{padding:8px 14px}
.workbench .review-filters{padding:4px 0 8px;gap:6px}
.workbench .review-filters p{font-size:11px;line-height:1.4}
.workbench .result-item{border:1px solid var(--desk-line)!important;border-left-width:1px!important;border-left-color:var(--desk-line)!important;border-radius:6px!important;background:var(--desk-white)!important;outline:none;padding:10px;margin:6px 0;color:var(--desk-ink)}
.workbench .result-item[aria-pressed=true]{background:var(--desk-selection)!important;border-color:var(--desk-blue)!important;outline:none;box-shadow:none!important}
.workbench .result-item .result-name small{color:var(--desk-muted)}
.workbench .result-verdicts .verdict{font-size:11px}
.workbench .verdict{border-radius:4px;font-weight:550}
.workbench .verdict.good{background:var(--desk-good-bg);color:var(--desk-good)}
.workbench .verdict.bad{background:var(--desk-bad-bg);color:var(--desk-bad)}
.workbench .verdict.warn{background:var(--desk-warn-bg);color:var(--desk-warn)}
.workbench .verdict.neutral{background:var(--desk-hover);color:var(--desk-muted)}
.workbench .review-detail{display:block;height:auto;min-height:252px;max-height:none;padding:16px 20px;background:var(--desk-sheet);border:1px solid var(--desk-line);border-radius:0 0 16px 16px;overflow:visible;grid-column:2/4;grid-row:2}
.workbench.viewing-results #resultsPane{min-height:120px}
.workbench #reviewDetailBody{display:grid;height:auto;min-height:218px;flex:none;grid-template-columns:minmax(0,1fr) 320px;grid-template-rows:auto auto;gap:12px 20px;min-width:0}
.workbench .detail-heading{grid-column:1;grid-row:1;margin:0;min-height:32px;align-items:start}
.workbench .detail-heading>div{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0}
.workbench .detail-heading h3{font-size:18px;line-height:1.4;font-weight:650;min-width:0}
.workbench .review-scroll{grid-column:1;grid-row:2;margin:0;min-height:0;padding:0;overflow:visible}
.workbench .review-decision{grid-column:2;grid-row:1/3;display:flex;flex-direction:column;align-items:stretch;gap:10px;padding-left:20px;border-left:1px solid var(--desk-line);min-width:0}
.workbench .review-decision>.verdict{align-self:flex-start;font-size:12px}
.workbench .text-comparison{gap:8px}
.workbench .text-comparison label{color:var(--desk-muted);font-size:11px}
.workbench .text-comparison pre{background:var(--desk-raised);border:1px solid var(--desk-line);color:var(--desk-ink);border-radius:5px;min-height:54px;max-height:none;overflow:visible;padding:10px 12px;font-size:max(16px,var(--review-font));margin-top:5px}
.workbench .review-note{flex:none;display:grid;gap:4px;padding-top:6px;border-top:1px solid var(--desk-line)}
.workbench .review-note label{font-size:12px;margin:0;color:var(--desk-muted)}
.workbench .review-note textarea{min-height:58px;height:58px;max-height:160px;resize:vertical;margin:0;padding:7px 8px;font-size:var(--review-font);line-height:1.5}
.workbench .review-buttons{background:var(--desk-sheet);border-color:var(--desk-line);padding-top:8px;gap:6px;margin-top:auto}
.workbench .review-buttons button{font-size:11px}
.workbench .review-buttons #acceptNext{background:var(--desk-ink);color:var(--desk-white);border-color:var(--desk-ink);min-height:36px;font-size:13px}
.workbench .review-buttons #acceptNext:hover:not(:disabled){background:var(--desk-blue);border-color:var(--desk-blue)}
.workbench .review-advanced summary{color:var(--desk-muted)}
.workbench .runbar{background:var(--desk-sheet);border-color:var(--desk-line);padding:10px 14px}
.workbench .runbar #run{background:var(--desk-ink);color:var(--desk-white);border-color:var(--desk-ink);min-height:40px}
.workbench.viewing-results .runbar #run{background:var(--desk-raised);color:var(--desk-ink);border-color:var(--desk-control);font-size:12px;min-height:34px}
.workbench .panel-grip:hover,.workbench .panel-grip:focus-visible{background:#2f668526}
.workbench dialog{background:var(--desk-sheet);color:var(--desk-ink);border:1px solid var(--desk-line);border-radius:16px;box-shadow:0 18px 64px #263d4726;padding:24px}
.workbench dialog::backdrop{background:#263d4766}
.workbench .dialog-heading{position:sticky;top:-24px;z-index:20;margin:-24px -24px 24px;padding:24px 24px 16px;background:var(--desk-sheet);border-bottom:1px solid var(--desk-line)}
.workbench .dialog-heading h2{font-size:20px;letter-spacing:-.025em}
.workbench .workbench-dialog details{border-color:var(--desk-line);padding-top:12px;margin-top:20px}
.workbench .workbench-dialog .connect-card{background:none;border:0}
.workbench .connect-card.connected #connectState{background:var(--desk-good-bg);color:var(--desk-good)}
.workbench #workbenchSettings>.connect-card,.workbench #workbenchSettings>.appearance-settings{padding:16px;background:var(--desk-raised);border-radius:8px}
.workbench .library-row{padding:16px 0;border-color:var(--desk-line);gap:8px}
.workbench .library-row small{color:var(--desk-muted);font-size:12px}
.workbench .comparison-viewport,.workbench .compare-images canvas{background:var(--desk-canvas);border-color:var(--desk-line)}
.workbench .compare-images figcaption{color:var(--desk-muted)}
.workbench .baseline-extra,.workbench .region-batch-tools,.workbench .map-list,.workbench #ocrDraftLines{background:var(--desk-raised);border-color:var(--desk-line);border-radius:6px}
.workbench .baseline-history-row{border-color:var(--desk-line)}
.workbench .baseline-history-row small{color:var(--desk-muted)}
.workbench .result-more summary{border-color:var(--desk-control);color:var(--desk-muted)}
.workbench .result-more .export-group{background:var(--desk-white);border-color:var(--desk-line);border-radius:6px;box-shadow:0 8px 24px #263d471a}
.workbench .desktop-compact-nav{display:none}
.workbench :is(.eyebrow,.canvas-label,.section-kicker,kbd){font-size:11px}
.workbench .diff{background:var(--desk-raised);color:var(--desk-ink)}
.workbench .diff :is(code,small){font-family:inherit;color:var(--desk-muted);font-size:11px}
.workbench .review-detail .diff{margin:4px 0;padding:5px 8px;min-height:28px}
.workbench .review-detail .diff>span{display:none}
.workbench .review-detail .diff code{font-size:var(--review-font);line-height:1.4}
.workbench .review-detail .review-scroll>.help{margin:4px 0}
@media(min-width:781px) and (max-height:750px){
 .workbench .review-detail{height:340px;min-height:330px;max-height:66%}
 .workbench #reviewDetailBody{gap:4px}
 .workbench .review-note textarea{min-height:44px;height:44px}
 .workbench .review-detail .review-buttons button{min-height:30px}
 .workbench .review-detail .review-buttons #acceptNext{min-height:34px}
 .workbench .workbench-tabs{height:50px;min-height:50px}
 .workbench.viewing-results #resultsPane{min-height:112px}
 .workbench .review-overview{padding:8px 14px;max-height:74px}
 .workbench .review-overview .summary strong{font-size:13px}
}
@media(min-width:781px) and (max-width:1100px){.workbench .topbar{gap:8px;padding:0 10px}.workbench .preview-card>.head{height:76px;min-height:76px;padding:8px 12px}.workbench .workbench-tabs{height:58px;min-height:58px}.workbench .workbench-provider select{width:136px}.workbench .save-indicator{font-size:11px}.workbench .workbench-top-actions{gap:5px}.workbench .workbench-top-actions button{padding:6px 8px}}
@media(max-width:780px){
 .workbench{background:var(--desk-sheet);overflow:auto}
 .workbench .topbar{position:relative;height:auto;min-height:60px;padding:10px 12px;gap:8px;background:var(--desk-frame)}
 .workbench .brand small,.workbench #versionCheck,.workbench .top-status{display:none}
 .workbench .workbench-top-actions{width:auto;flex:1;margin:0;justify-content:flex-end;gap:6px}
 .workbench .workbench-top-actions button{min-height:36px;padding:6px 10px}
 .workbench .save-indicator{font-size:11px;max-width:145px}
 .workbench .workbench-provider{order:5;width:100%;display:flex}
 .workbench .workbench-provider select{width:auto;max-width:none;flex:1;min-height:36px}
 .workbench .workbench-provider .chip{display:block}
 .workbench .desktop-compact-nav{display:flex;align-items:center;position:sticky;top:0;z-index:12;background:var(--desk-sheet);border-bottom:1px solid var(--desk-line);padding:0 16px;gap:18px}
 .workbench .desktop-compact-nav h1{font-size:14px;font-weight:650;margin:0 auto 0 0;line-height:1.4}
 .workbench[data-mobile-view=canvas] .desktop-compact-nav h1{display:none}
 .workbench .desktop-compact-nav button{min-height:44px;padding:8px 0;border:0;border-radius:0;background:transparent;color:var(--desk-muted);font-size:14px}
 .workbench .desktop-compact-nav button[aria-pressed=true]{color:var(--desk-ink);box-shadow:inset 0 -2px var(--desk-ink)}
 .workbench .workbench-shell,.workbench[data-layout=image] .workbench-shell,.workbench[data-layout=text] .workbench-shell{display:block;height:auto;margin:0}
 .workbench .workbench-center,.workbench .workbench-right{border:0;border-radius:0}
 .workbench .card.workspace-card{max-height:none;min-height:calc(100dvh - 160px);padding:16px;background:var(--desk-sheet)}
 .workbench .image-queue{grid-template-columns:1fr 1fr}
 .workbench .image-actions,.workbench .workspace-save-actions{display:flex;width:100%}
 .workbench .image-navigation{grid-template-columns:1fr 1fr}
 .workbench .image-navigation input{grid-column:1/-1}
 .workbench .workbench-center{height:calc(100dvh - 156px);min-height:380px}
 .workbench .workbench-right{height:auto;min-height:0;overflow:visible}
 .workbench .workbench-pane{flex:none;overflow:auto}
 .workbench #settingsPane{height:auto;max-height:none}
 .workbench #resultsPane{min-height:210px;max-height:340px}
 .workbench[data-mobile-view=canvas] .workspace-card,.workbench[data-mobile-view=canvas] .workbench-right,
 .workbench[data-mobile-view=review] .workspace-card,.workbench[data-mobile-view=review] .workbench-center,
 .workbench[data-mobile-view=images] .workbench-center,.workbench[data-mobile-view=images] .workbench-right{display:none}
 .workbench[data-mobile-view=images] .workspace-card{display:block}
 .workbench .preview-card>.head{min-height:66px;padding:10px 16px}
 .workbench .canvas-toolbar{justify-content:space-between;gap:8px;padding:8px 12px}
 .workbench .canvas-toolbar button{min-height:36px}
 .workbench .canvas-toolbar .zoom-tools{flex-wrap:wrap}
 .workbench .workbench-tabs{height:50px;min-height:50px}
 .workbench .review-overview{max-height:118px;padding:10px 16px}
 .workbench .review-overview .summary strong{font-size:14px}
 .workbench .review-detail{height:auto;max-height:none;min-height:0;padding:16px}
 .workbench #reviewDetailBody{height:auto}
 .workbench .review-scroll{flex:none;min-height:150px;max-height:280px;margin:4px 0}
 .workbench .review-detail .review-buttons button{min-height:40px;font-size:12px}
 .workbench .review-note textarea{height:56px;min-height:56px;font-size:14px}
 .workbench .review-filters>div{flex-wrap:nowrap}
 .workbench .review-filters input,.workbench .review-filters select{min-height:36px;font-size:13px}
 .workbench .review-filters p{font-size:11px}
 .workbench .result-item{min-height:54px}
 .workbench .result-item .result-name{font-size:14px}
 .workbench .result-item .result-name small,.workbench .result-verdicts .verdict{font-size:11px}
 .workbench .workbench-pane .results-card{padding:8px 16px}
 .workbench .runbar #run,.workbench.viewing-results .runbar #run{min-height:44px;font-size:13px}
 .workbench .workbench-dialog,.workbench .feature-dialog{max-height:90dvh;padding:18px;width:calc(100% - 24px)}
 .workbench .dialog-heading{top:-18px;margin:-18px -18px 20px;padding:18px 18px 14px}
 .workbench dialog :is(button,select,input:not([type=checkbox])){min-height:40px}
 .workbench dialog .toolbar{flex-wrap:wrap}
 .workbench dialog .toolbar button{flex:1}
 .workbench .library-row span{min-width:0;flex-basis:100%;overflow-wrap:anywhere}
 .workbench .compare-images{grid-template-columns:1fr}
 .workbench .compare-images .comparison-viewport{height:180px}
 .workbench.canvas-focus .desktop-compact-nav,.workbench.canvas-focus .workbench-center{display:block}
 .workbench.canvas-focus .workbench-shell{height:auto}
 .workbench.canvas-focus .workbench-center{height:calc(100dvh - 156px)}
}
@media(max-width:430px){.workbench .brand b{font-size:14px}.workbench .save-indicator{max-width:100px}.workbench .workbench-top-actions{gap:5px}.workbench .workbench-top-actions button{padding:6px 8px;font-size:12px}.workbench .canvas-toolbar{justify-content:flex-start}.workbench .zoom-tools{width:100%}.workbench .desktop-compact-nav{gap:18px}.workbench .image-queue{grid-template-columns:1fr}.workbench .review-overview .analysis-detail{display:none}}
/* The review dock gives evidence and decisions their own horizontal workspace.
   Long OCR and notes grow this row; the document scrolls rather than clipping a pane. */
.workbench{overflow-x:hidden;overflow-y:auto;font-variant-numeric:tabular-nums}
.workbench .desk-workflow{display:flex;gap:16px;list-style:none;margin:0 0 0 auto;padding:0;color:var(--desk-muted);font-size:12px;white-space:nowrap}
.workbench .desk-workflow li{padding:4px 0}
.workbench.viewing-results .desk-workflow li:last-child,.workbench:not(.viewing-results) .desk-workflow li:nth-child(2){color:var(--desk-ink);font-weight:650;border-bottom:2px solid var(--desk-blue)}
.workbench .preview-card>.head{height:68px;min-height:68px;gap:8px}
.workbench .desk-title{font-size:18px}
.workbench .layout-switch{width:auto}
.workbench .workspace-card{grid-column:1;grid-row:1}
.workbench .workbench-center{grid-column:2;grid-row:1}
.workbench .workbench-right{grid-column:3;grid-row:1}
.workbench.review-dock-open .workbench-shell{grid-template-rows:minmax(420px,1fr) max-content;min-height:672px}
.workbench.review-dock-open .workspace-card{grid-row:1/3}
.workbench.review-dock-open .workbench-center{border-radius:16px 0 0 0}
.workbench.review-dock-open .workbench-right{border-radius:0 16px 0 0}
.workbench.review-dock-open .panel-grip.right{position:relative;right:auto;left:-4px;top:0;bottom:auto;grid-column:3;grid-row:1;justify-self:start;height:100%}
.workbench .review-overview{max-height:none;padding:10px 14px}
.workbench .review-overview .summary{gap:5px}
.workbench .review-overview .summary>.analysis-detail{display:block}
.workbench .review-overview .analysis-detail summary{cursor:pointer;white-space:nowrap}
.workbench .review-overview .analysis-detail[open]{grid-column:1/-1;text-align:left}
.workbench .review-overview .analysis-detail[open] span{display:block;padding-top:6px}
.workbench .review-overview .summary>span:not(.analysis-detail){font-size:11px}
.workbench .review-overview .judgment-row{gap:4px}
.workbench .review-overview .verdict{font-size:11px;padding:2px 4px}
.workbench .workbench-tabs{height:50px;min-height:50px}
.workbench .review-filters{padding:2px 0 6px}
.workbench .review-filters p{margin:4px 0 0}
.workbench .results-card{padding:8px 14px}
.workbench .result-item{padding:9px 10px!important}
.workbench .result-label{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.workbench .review-detail .diff code{font-size:max(14px,var(--review-font))}
.workbench .review-detail .diff{max-height:none;overflow:visible}
.workbench .review-detail .review-scroll>.help{font-size:12px;line-height:1.5}
.workbench .review-detail .review-advanced{margin-top:8px;font-size:12px}
.workbench[data-layout=image] .workbench-center,.workbench[data-layout=text] .workbench-center{grid-column:1}
.workbench[data-layout=image] .workbench-right,.workbench[data-layout=text] .workbench-right{grid-column:2}
.workbench[data-layout=image] .review-detail,.workbench[data-layout=text] .review-detail{grid-column:1/3}
.workbench[data-layout=image].review-dock-open .panel-grip.right{grid-column:2}
.workbench.canvas-focus .workbench-shell{grid-template-columns:1fr;grid-template-rows:1fr;min-height:0}
.workbench.canvas-focus .workbench-center{grid-column:1;border-radius:16px}
.workbench.canvas-focus .review-detail{display:none}
@media(min-width:781px) and (max-width:1100px){
 .workbench #reviewDetailBody{grid-template-columns:minmax(0,1fr) 280px;gap:12px 16px}
 .workbench .review-decision{padding-left:16px}
 .workbench .preview-card>.head{height:84px;min-height:84px}
 .workbench .desk-workflow{order:4;width:100%;margin:0}
 .workbench .desk-title{font-size:16px}
 .workbench .review-detail{padding:14px 16px}
}
@media(min-width:781px) and (max-height:740px){
 .workbench .review-detail{height:auto;min-height:252px;max-height:none}
 .workbench #reviewDetailBody{gap:8px 16px}
 .workbench .review-note textarea{min-height:52px;height:52px}
 .workbench .review-overview .summary strong{font-size:12px}
 .workbench .review-overview{padding:7px 14px}
 .workbench .review-overview .summary{gap:4px}
 .workbench .review-overview .summary>.judgment-row{flex-wrap:nowrap}
 .workbench .review-overview .summary>.judgment-row .verdict{white-space:normal;line-height:1.3}
}
@media(max-width:780px){
 .workbench .desk-workflow,.workbench .layout-switch{display:none}
 .workbench .preview-card>.head{height:66px;min-height:66px}
 .workbench.review-dock-open .workbench-shell{height:auto;min-height:0}
 .workbench .workbench-right{min-height:0}
 .workbench .review-detail{display:block;height:auto;min-height:0;max-height:none;padding:18px 16px;border:0;border-top:1px solid var(--desk-line);border-radius:0}
 .workbench .review-detail[hidden]{display:none}
 .workbench #reviewDetailBody{display:flex;flex-direction:column;gap:16px}
 .workbench .detail-heading h3{font-size:18px}
 .workbench .review-scroll{flex:none;min-height:150px;max-height:none;overflow:visible;margin:0}
 .workbench .review-decision{padding:16px 0 0;border-left:0;border-top:1px solid var(--desk-line);gap:12px}
 .workbench .review-note{padding-top:0;border-top:0}
 .workbench .review-note textarea{height:70px;min-height:70px;font-size:14px}
 .workbench .review-filters p,.workbench .result-item .result-name small,.workbench .result-verdicts .verdict{font-size:12px}
 .workbench .review-overview .summary strong{font-size:14px}
 .workbench .review-overview{padding:10px 16px}
 .workbench .review-overview .summary>.judgment-row{flex-wrap:wrap}
 .workbench .review-overview .summary>.judgment-row .verdict{font-size:12px}
 .workbench[data-mobile-view=canvas] .review-detail,.workbench[data-mobile-view=images] .review-detail{display:none}
 .workbench .runbar{padding:10px 16px}
 .workbench #resultsPane{min-height:210px;max-height:360px}
 .workbench .review-scroll .text-comparison{gap:10px}
}
@media(max-width:430px){.workbench .review-scroll .text-comparison{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.workbench *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
