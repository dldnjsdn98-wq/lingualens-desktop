const readline=require('node:readline');let count=0;
const write=value=>process.stdout.write(JSON.stringify(value)+'\n');
readline.createInterface({input:process.stdin}).on('line',line=>{
  const request=JSON.parse(line),params=request.params||{};
  if(request.method==='initialize')return write({id:request.id,result:{}});
  if(request.method==='thread/start')return write({id:request.id,result:{thread:{id:'thread-'+(++count)}}});
  if(request.method==='turn/start'){
    write({id:request.id,result:{turn:{id:'turn-'+count,status:'inProgress'}}});
    if(params.input[0].text==='WAIT')return;
    setTimeout(()=>{write({method:'item/started',params:{threadId:params.threadId,item:{type:'agentMessage'}}});write({method:'item/completed',params:{threadId:params.threadId,item:{id:'message',type:'agentMessage',text:JSON.stringify({lines:[{text:String(count),confidence:.99}]})}}});write({method:'turn/completed',params:{threadId:params.threadId,turn:{status:'completed'}}})},10);
    return;
  }
  if(request.id!=null)write({id:request.id,result:{}});
});
