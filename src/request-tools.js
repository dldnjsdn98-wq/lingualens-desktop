// Shared browser helper; preserve cancellation and give readable local server errors.
export async function jsonRequest(url,options={},failure='요청을 완료하지 못했습니다.'){
  const signal=options.signal;
  const httpError=(message,status)=>Object.assign(Error(message),{status});
  signal?.throwIfAborted();
  let response;
  try{response=await fetch(url,options)}catch(error){
    signal?.throwIfAborted();
    if(error.name==='AbortError'||error.name==='TimeoutError')throw error;
    throw Error('앱 서버에 연결하지 못했습니다. 앱이 실행 중인지 확인한 뒤 다시 시도하세요.');
  }
  let data;
  try{data=await response.json()}catch(error){
    signal?.throwIfAborted();
    if(error.name==='AbortError'||error.name==='TimeoutError')throw error;
    throw response.ok?Error('서버 응답을 읽지 못했습니다. 다시 시도하세요.'):httpError(failure+' (HTTP '+response.status+')',response.status);
  }
  signal?.throwIfAborted();
  if(!response.ok)throw httpError(typeof data?.error?.message==='string'&&data.error.message.trim()?data.error.message:failure+' (HTTP '+response.status+')',response.status);
  if(data===null||typeof data!=='object')throw Error('서버 응답 형식이 올바르지 않습니다. 다시 시도하세요.');
  return data;
}
