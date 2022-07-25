const deserializeSchema = {
  0b000000: "firstName",
  0b000001: "lastName",
  0b000010: "age",
  0b000011: "date",
  0b000100: "address",
  0b000101: "count"
}

const deserialize = (arr, schema) => {
  const result = {}
  const buffer = new Uint16Array(arr)
  const len = buffer.length;
  let index = 0;
  while (index != len) {
    // type
    const type = schema[buffer[index++]]
    // length
    const len = buffer[index++]
    let byteIndex = 0;
    var next = "";
    while (byteIndex++ != len) {
      next += String.fromCharCode(buffer[index++])
    }
    result[type] = next;
  }
  return result;
}


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
  const buffer = e.data
  const obj = deserialize(buffer, deserializeSchema)
  doWork(obj)
  self.postMessage(buffer, [buffer]);
}

