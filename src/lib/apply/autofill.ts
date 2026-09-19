/**
 * Builds a self-contained bookmarklet that fills an employer's application form
 * with the data the agent prepared. No extension, no server call: the payload
 * travels inside the bookmarklet itself and runs only on the page the user opens.
 */
export type AutofillPayload = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  headline: string;
  coverLetter: string;
  answers: Array<{ question: string; answer: string }>;
};

const SCRIPT = `(function(){
var D=__PAYLOAD__;
function norm(s){return (s||"").toLowerCase().replace(/[\\s_\\-\\*:]+/g," ").trim()}
function labelFor(el){
  var t=[el.name,el.id,el.getAttribute("placeholder"),el.getAttribute("aria-label")].join(" ");
  if(el.id){var l=document.querySelector('label[for="'+el.id+'"]');if(l)t+=" "+l.textContent}
  var p=el.closest("label");if(p)t+=" "+p.textContent;
  var w=el.closest("div,li,fieldset,section");if(w){var lb=w.querySelector("label");if(lb)t+=" "+lb.textContent}
  return norm(t)
}
function has(t,words){for(var i=0;i<words.length;i++){if(t.indexOf(words[i])>-1)return true}return false}
function setVal(el,v){
  var proto=el.tagName==="TEXTAREA"?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
  var setter=Object.getOwnPropertyDescriptor(proto,"value").set;
  setter.call(el,v);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
  el.style.outline="2px solid #16a34a";
}
function answerFor(t){
  for(var i=0;i<D.answers.length;i++){
    var q=norm(D.answers[i].question).split(" ").filter(function(w){return w.length>4});
    var hit=0;for(var j=0;j<q.length;j++){if(t.indexOf(q[j])>-1)hit++}
    if(hit>=2)return D.answers[i].answer
  }
  return null
}
var n=0;
var els=document.querySelectorAll("input,textarea");
for(var i=0;i<els.length;i++){
  var el=els[i];
  var type=(el.type||"").toLowerCase();
  if(type==="hidden"||type==="file"||type==="submit"||type==="button"||type==="checkbox"||type==="radio")continue;
  if(el.value&&el.value.trim())continue;
  var t=labelFor(el);var v=null;
  if(type==="email"||has(t,["email","e mail","بريد"]))v=D.email;
  else if(type==="tel"||has(t,["phone","mobile","tel","whatsapp","هاتف","جوال"]))v=D.phone;
  else if(has(t,["first name","given name","الاسم الاول"]))v=D.firstName;
  else if(has(t,["last name","family name","surname","اسم العائلة"]))v=D.lastName;
  else if(has(t,["full name","your name","name","الاسم"])&&!has(t,["company","user","file"]))v=D.fullName;
  else if(has(t,["city","town","المدينة"]))v=D.city;
  else if(has(t,["country","الدولة"]))v=D.country;
  else if(has(t,["current title","job title","position you","headline","المسمى"]))v=D.headline;
  else if(el.tagName==="TEXTAREA"){v=answerFor(t)||D.coverLetter}
  else v=answerFor(t);
  if(v){setVal(el,v);n++}
}
var b=document.createElement("div");
b.textContent=n+" fields filled by Shoghlni — check them, attach your CV, then submit.";
b.setAttribute("style","position:fixed;z-index:999999;inset-inline:16px;bottom:16px;background:#0f2murder;background:#0f244a;color:#fff;font:14px system-ui;padding:12px 16px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35)");
document.body.appendChild(b);
setTimeout(function(){b.remove()},6000);
})()`;

export function buildAutofillBookmarklet(payload: AutofillPayload): string {
  const body = SCRIPT.replace("__PAYLOAD__", JSON.stringify(payload));
  return `javascript:${encodeURIComponent(body)}`;
}

export function splitName(fullName: string) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}
