// OCR scores are estimates, not calibrated probabilities of correctness.
export function reviewMatch(result, all, {threshold=.8}={}) {
  if(!result.found&&!result.textMatched)return {...result,status:'failed',textMatched:false,reviewRequired:false};
  const evidence=result.evidence||[];
  const scores=(result.recognitionScores||evidence.map(x=>x.confidence)).filter(Number.isFinite);
  const uncertain=scores.length>0&&Math.min(...scores)<threshold;
  const similarBox=(a,b)=>{
    if(!a||!b)return false;
    const area=a.width*a.height,other=b.width*b.height;
    const common=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
    return common/Math.max(area,other)>.75;
  };
  const conflicting=evidence.some(line=>all.some(other=>other!==line&&other.text!==line.text&&
    other.confidence>=threshold&&similarBox(line.boundingBox,other.boundingBox)));
  const reviewRequired=uncertain||conflicting;
  return {...result,textMatched:true,found:!reviewRequired,reviewRequired,status:reviewRequired?'review':'passed',
    reasonCode:reviewRequired?(conflicting?'conflicting_readings':'low_confidence'):result.reasonCode,
    reason:reviewRequired?(conflicting?'같은 영역의 인식 결과가 서로 다릅니다. 다시 확인하세요.':'글자는 일치하지만 인식이 불확실합니다. 영역을 다시 확인하세요.'):result.reason};
}
