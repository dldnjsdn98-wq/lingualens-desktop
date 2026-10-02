import {readFileSync as readAsset} from 'node:fs';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {projectStore} from './project-store.js';
import {workspaceStore} from './workspace-store.js';
import {reviewMatch} from './review-policy.js';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {page} from './page.js';
import {styles} from './styles.js';
import {clientSource} from './client-source.js';
import {languages,magic,dimensions,targets,sanitizeLines,validate} from './matcher.js';
import {commandAvailable,extract,openLogin,loginSession,loginState,closeConnections} from './cli.js';

import {cachedExtractor,defaultCacheRoot} from './ocr-cache.js';
import {localOcr} from './local-ocr.js';
import {folderWatch,pickFolder} from './folder-watch.js';
import {defaultProjectRoot} from './project-store.js';
import {excludedLine} from './feature-tools.js';
import {storageMaintenance} from './storage-maintenance.js';
import {alignImages} from './image-alignment.js';
const maxBody=13_000_000;
const currentVersion=readFileSync(new URL('../version.txt',import.meta.url),'utf8').trim();
async function versionStatus(online){let latest=null;if(online)try{const response=await fetch('https://api.github.com/repos/dldnjsdn98-wq/lingualens-desktop/releases/latest',{headers:{'User-Agent':'LinguaLens-Windows'},signal:AbortSignal.timeout(5000)});if(response.ok){const release=await response.json();if(/^v?\d+\.\d+\.\d+$/.test(release.tag_name))latest=release.tag_name.replace(/^v/,'')}}catch{}return {current:currentVersion,latest,upToDate:latest===currentVersion}}
const reply=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};
const errors=(res,status,code,message)=>reply(res,status,{error:{code,message}});
const readBody=async (req,limit=maxBody)=>{const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('too_large');parts.push(chunk)}return Buffer.concat(parts)};
function parseMultipart(buffer,boundary){const marker=Buffer.from('--'+boundary),parts={};let cursor=buffer.indexOf(marker);while(cursor>=0){const next=buffer.indexOf(marker,cursor+marker.length);if(next<0)break;const start=cursor+marker.length+2,headerEnd=buffer.indexOf('\r\n\r\n',start);if(headerEnd<0||headerEnd>next)break;const header=buffer.subarray(start,headerEnd).toString('utf8'),match=/name="([^"]+)"/.exec(header);if(match)parts[match[1]]={header,data:buffer.subarray(headerEnd+4,next-2)};cursor=next}return parts}
const serverPort=req=>req.socket.localPort;
function checkOrigin(req){return req.headers.origin===`http://${req.headers.host}`}
  const moduleAssets=Object.fromEntries(['comparison-worker','enhancement-tools','feature-tools'].map(name=>['/'+name+'.js',['application/javascript; charset=utf-8',readAsset(new URL('./'+name+'.js',import.meta.url),'utf8')]]));
  const assets={...moduleAssets,'/':['text/html; charset=utf-8',page(languages,createHash('sha256').update(clientSource+styles).digest('hex').slice(0,12))],'/app.js':['application/javascript; charset=utf-8',clientSource],'/styles.css':['text/css; charset=utf-8',styles],'/filepond.js':['application/javascript; charset=utf-8',readFileSync(new URL('../vendor/FILEPOND.min.js',import.meta.url))],'/filepond.css':['text/css; charset=utf-8',readFileSync(new URL('../vendor/FILEPOND.min.css',import.meta.url))],'/sortable.js':['application/javascript; charset=utf-8',readFileSync(new URL('../vendor/Sortable.min.js',import.meta.url))],'/pixelmatch.js':['application/javascript; charset=utf-8',readFileSync(new URL('../vendor/pixelmatch.js',import.meta.url))],'/xlsx.js':['application/javascript; charset=utf-8',readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url))]};
export function makeServer({extractor=extract,availability=commandAvailable,authentication=loginState,startLogin=openLogin,sessionStatus=loginSession,projectRoot,cacheRoot=extractor===extract?defaultCacheRoot:undefined}={}){const projects=projectStore(projectRoot),workspace=workspaceStore(projectRoot),watcher=folderWatch(),local=localOcr(),progress=new Map();const readImage=cachedExtractor((provider,...args)=>provider==='local'?local.extract(provider,...args):extractor(provider,...args),{root:cacheRoot});const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');
  if(![`127.0.0.1:${serverPort(req)}`,`localhost:${serverPort(req)}`].includes(req.headers.host))return errors(res,403,'host','앱에서 다시 시도하세요.');
  if(url.pathname.startsWith('/api/images')||url.pathname.startsWith('/api/watch')||url.pathname==='/api/compare/align'){
   if(![`127.0.0.1:${serverPort(req)}`,`localhost:${serverPort(req)}`].includes(req.headers.host))return errors(res,403,'host','앱에서 다시 시도하세요.');
   try{
    if(req.method==='GET'&&url.pathname==='/api/images'){const ref={hash:url.searchParams.get('hash'),type:url.searchParams.get('type'),size:Number(url.searchParams.get('size'))};if(!['image/png','image/jpeg','image/webp'].includes(ref.type)||!Number.isInteger(ref.size)||ref.size>10485760)throw Error('이미지 정보를 확인하세요.');const bytes=await projects.readImage(ref);res.writeHead(200,{'content-type':ref.type,'cache-control':'private, max-age=3600','x-content-type-options':'nosniff'});return res.end(bytes)}
    if(req.method==='GET'&&url.pathname==='/api/watch/files'){const file=await watcher.read(url.searchParams.get('id'),url.searchParams.get('key'));res.writeHead(200,{'content-type':file.type,'cache-control':'no-store'});return res.end(file.bytes)}
    if(req.method!=='POST'||!checkOrigin(req))return errors(res,403,'origin','앱에서 다시 시도하세요.');
    if(url.pathname==='/api/images'){const bytes=await readBody(req,10485760),type=magic(bytes);if(!type)throw Error('PNG, JPG, WebP 이미지를 선택하세요.');return reply(res,200,await projects.putImage(bytes,type))}
    const body=JSON.parse((await readBody(req,16384)).toString('utf8')||'{}');
    if(url.pathname==='/api/compare/align'){
     const ignore=body.ignore||[];if(!Array.isArray(ignore)||ignore.length>40||ignore.some(r=>!r)||(ignore.length&&!targets(JSON.stringify(ignore.map(region=>({id:'ignore',text:'ignore',language:'en',mode:'exact',region}))))))throw Error('무시 영역을 확인하세요.');
     const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort()});
     const [before,after]=await Promise.all([projects.readImage(body.before),projects.readImage(body.after)]);
     return reply(res,200,await alignImages(before,after,{ignore,scale:body.scale===true,signal:controller.signal}));
    }
    if(url.pathname==='/api/watch/pick')return reply(res,200,{path:await pickFolder(projectRoot||defaultProjectRoot)});
    if(url.pathname==='/api/watch/start')return reply(res,200,await watcher.start(body.path,!!body.includeExisting));
    if(url.pathname==='/api/watch/poll')return reply(res,200,await watcher.poll(body.id));
    if(url.pathname==='/api/watch/ack'){watcher.ack(body.id,body.keys||[]);return reply(res,200,{ok:true})}
    if(url.pathname==='/api/watch/stop'){watcher.stop();return reply(res,200,{ok:true})}
    return errors(res,404,'not_found','가져오기 요청을 확인하세요.');
   }catch(e){return errors(res,400,'image_watch',e.message)}
  }
  if(url.pathname.startsWith('/api/workspace/')){
    if(req.headers.host!==`127.0.0.1:${serverPort(req)}`&&req.headers.host!==`localhost:${serverPort(req)}`)return errors(res,403,'host','앱에서 다시 시도하세요.');
    try{
      if(req.method==='GET'){
        if(url.pathname==='/api/workspace/drafts')return reply(res,200,url.searchParams.has('id')?await workspace.draft(url.searchParams.get('id'),{references:url.searchParams.has('references')}):await workspace.drafts());
        if(url.pathname==='/api/workspace/presets')return reply(res,200,await workspace.presets());if(url.pathname==='/api/workspace/preferences')return reply(res,200,await workspace.preferences());
        if(url.pathname==='/api/workspace/storage')return reply(res,200,await storageMaintenance(projectRoot||defaultProjectRoot));
      }
      if(req.method!=='POST'||!checkOrigin(req))return errors(res,403,'origin','앱에서 다시 시도하세요.');
      const data=JSON.parse((await readBody(req,125829120)).toString('utf8'));
      if(url.pathname==='/api/workspace/storage/clean')return reply(res,200,await storageMaintenance(projectRoot||defaultProjectRoot,{remove:true}));
      if(url.pathname==='/api/workspace/preferences')return reply(res,200,await workspace.savePreferences(data));if(url.pathname==='/api/workspace/drafts')return reply(res,200,await workspace.saveDraft(data));
      if(url.pathname==='/api/workspace/drafts/delete'){await workspace.removeDraft(data.id);return reply(res,200,{ok:true})}
      if(url.pathname==='/api/workspace/presets')return reply(res,200,await workspace.savePreset(data));
      if(url.pathname==='/api/workspace/presets/delete'){await workspace.removePreset(data.id);return reply(res,200,{ok:true})}
      return errors(res,404,'not_found','저장 요청을 확인하세요.');
    }catch(error){return errors(res,400,'workspace_error',error.message==='too_large'?'작업 용량이 너무 큽니다.':error.code==='ENOENT'?'저장된 항목을 찾지 못했습니다.':error.message)}
  }
  if(url.pathname.startsWith('/api/projects')){if(req.headers.host!==`127.0.0.1:${serverPort(req)}`&&req.headers.host!==`localhost:${serverPort(req)}`)return errors(res,403,'host','앱에서 다시 시도하세요.');try{if(req.method==='GET'){return reply(res,200,url.pathname==='/api/projects/trash'?await projects.trash():url.searchParams.has('id')?await projects.get(url.searchParams.get('id'),{references:url.searchParams.has('references')}):await projects.list())}if(req.method!=='POST'||!checkOrigin(req))return errors(res,403,'origin','앱에서 다시 시도하세요.');const data=JSON.parse((await readBody(req,125829120)).toString('utf8'));return reply(res,200,url.pathname==='/api/projects/delete'?(await projects.discard(data.id),{ok:true}):url.pathname==='/api/projects/restore'?await projects.restore(data.id):url.pathname==='/api/projects/move'?await projects.move(data.id,data.folder):await projects.save(data))}catch(e){return errors(res,400,'project_error',e.message==='too_large'?'작업 용량이 너무 큽니다.':e.code==='ENOENT'?'저장된 작업을 찾지 못했습니다.':e.message)}}if(req.method==='GET'){
  if(url.pathname==='/api/progress')return reply(res,200,{stage:progress.get(url.searchParams.get('id'))||''});
  if(url.pathname==='/healthz')return reply(res,200,{status:'ok',app:'LinguaLens-desktop-v1',version:currentVersion,provider:'local-cli',matcher:'deterministic-v3'});
  if(url.pathname==='/app/version')return reply(res,200,await versionStatus(url.searchParams.has('latest')));
  if(url.pathname==='/auth/status'){const provider=['gemini','codex','local'].includes(url.searchParams.get('provider'))?url.searchParams.get('provider'):'codex';const installed=provider==='local'?local.available():await availability(provider),authenticated=installed&&(provider==='local'||await authentication(provider));return reply(res,200,{configured:installed,connected:installed,authenticated,provider})}
  if(url.pathname==='/auth/session'){const session=sessionStatus(url.searchParams.get('id'));return session?reply(res,200,session):errors(res,404,'session_missing','로그인 상태를 찾지 못했습니다.')}
  if(url.pathname==='/api/v1/languages')return reply(res,200,{data:languages});
  const asset=assets[url.pathname];if(asset){res.writeHead(200,{'content-type':asset[0],'cache-control':'no-cache','content-security-policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:"});return res.end(asset[1])}return errors(res,404,'not_found','경로를 찾지 못했습니다.')}
  if(req.method!=='POST'||!checkOrigin(req))return errors(res,403,'origin_mismatch','앱 창에서 다시 시도하세요.');
  if(url.pathname==='/auth/login'){const provider=url.searchParams.get('provider');if(!['gemini','codex'].includes(provider))return errors(res,400,'invalid_provider','도구를 선택하세요.');try{return reply(res,200,await startLogin(provider))}catch(error){return errors(res,error.code==='CLI_MISSING'?409:500,error.code==='CLI_MISSING'?'cli_missing':'login_launch_failed',error.message||'로그인 페이지를 열지 못했습니다.')}}
  if(url.pathname==='/api/ocr-cache/clear'){await readImage.clear();return reply(res,200,{ok:true})}
  if(url.pathname==='/auth/disconnect')return errors(res,400,'use_cli_logout','로그아웃은 CLI에서 직접 실행하세요.');
  if(url.pathname!=='/api/v1/jobs')return errors(res,404,'not_found','경로를 찾지 못했습니다.');
  const analysisController=new AbortController();res.on('close',()=>{if(!res.writableEnded)analysisController.abort()});
  try{const provider=req.headers['x-lingualens-provider'];if(!['gemini','codex','local'].includes(provider))return errors(res,400,'invalid_provider','분석 도구를 선택하세요.');const contentType=req.headers['content-type']||'',boundary=/boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType)?.slice(1).find(Boolean);if(!boundary)return errors(res,400,'invalid_form','이미지와 문구를 읽지 못했습니다.');const parts=parseMultipart(await readBody(req),boundary),image=parts.image?.data,list=targets(parts.entries?.data.toString('utf8'));if(!image||!list)return errors(res,400,'invalid_input','이미지와 검증 문구를 확인하세요.');if(image.length>10_485_760)return errors(res,413,'image_too_large','이미지는 10MB 이하여야 합니다.');const type=magic(image);if(!type)return errors(res,415,'invalid_image','PNG, JPG 또는 WebP 이미지를 선택하세요.');const size=dimensions(image,type);if(size&&(!size.width||!size.height||size.width*size.height>64_000_000))return errors(res,413,'image_dimensions','이미지 해상도가 너무 큽니다.');
  if(provider==='local'?!local.available():!await authentication(provider))return errors(res,401,'login_required','선택한 도구의 로그인을 완료한 뒤 다시 시도하세요.');
  const job=String(req.headers['x-lingualens-job']||'');const onProgress=/^[a-f0-9-]{36}$/.test(job)?stage=>{progress.set(job,stage);setTimeout(()=>progress.delete(job),150000).unref()}:undefined;
  const ignore=JSON.parse(parts.ignoreRegions?.data.toString('utf8')||'[]');if(!Array.isArray(ignore)||ignore.length>40||ignore.some(r=>!r)||(ignore.length&&!targets(JSON.stringify(ignore.map(region=>({id:'ignore',text:'ignore',language:'en',mode:'exact',region}))))))return errors(res,400,'ignore','무시 영역을 확인하세요.');
  const started=Date.now(),parsed=await readImage(provider,image,type,analysisController.signal,{fresh:req.headers['x-lingualens-fresh']==='1',mode:req.headers['x-lingualens-mode']==='standard'?'standard':'fast',wantBoxes:ignore.length>0||list.some(item=>!!item.region),languages:list.map(item=>item.language),onProgress}),lines=sanitizeLines(parsed.lines).filter(line=>!excludedLine(line,ignore)),extracted=String(ignore.length?lines.map(x=>x.text).join('\n'):parsed.extractedText||lines.map(x=>x.text).join('\n')).replace(/\r\n?/g,'\n'),results=list.map(item=>reviewMatch(validate(item,lines,extracted),lines)),foundCount=results.filter(x=>x.found).length,evidence=results.flatMap(x=>x.evidence),confidence=evidence.length?evidence.reduce((a,x)=>a+x.confidence,0)/evidence.length:0;return reply(res,200,{id:randomUUID(),status:'succeeded',result:{found:foundCount===results.length,foundCount,totalCount:results.length,confidence,extractedText:extracted,lines,results,reviewCount:results.filter(x=>x.reviewRequired).length,provider:parsed.provider||provider+'-cli',image:parsed.image||size,timing:{providerMs:Date.now()-started,totalMs:Date.now()-started,cacheHit:!!parsed.cacheHit}}});
  }catch(error){return errors(res,error.message==='too_large'?413:502,'cli_error',error.code==='ENOENT'?'선택한 CLI가 설치되어 있지 않습니다.':String(error.message||'CLI 실행 실패').slice(0,500))}
  });server.on('close',()=>{local.close();if(extractor===extract)closeConnections()});return server;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const server=makeServer();let lastRequest=Date.now();server.on('request',()=>{lastRequest=Date.now()});setInterval(()=>{if(Date.now()-lastRequest>120000){server.closeAllConnections();server.close()}},15000).unref();const port=Number(process.argv[2])||41837;server.listen(port,'127.0.0.1',()=>console.log('READY http://127.0.0.1:'+server.address().port));}
