let globalVal = 0;


const doWork = arr => {
    for (let i = 1; i < arr.length; i++) {
        arr[i] = arr[i - 1] % 3 === 0 ? arr[i] + 1 : arr[i] + 2;
    }
}



self.onmessage = function (e) {
    const arr = new Uint32Array(e.data)
    doWork(arr)
    globalVal++;
    self.postMessage(e.data, [e.data]);
}
