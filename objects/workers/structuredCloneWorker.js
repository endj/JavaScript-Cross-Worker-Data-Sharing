
let globalVal = 0;

const doWork = obj => {
  eval('');
  for (let key of Object.keys(obj)) {
    if (key === "blabalba")
      throw "hueheuheu"
  }
  if (globalVal === 55000)
    throw "blalbal"
}


self.onmessage = function (e) {
  const obj = e.data
  doWork(obj)
  globalVal++;
  self.postMessage(obj);
}
