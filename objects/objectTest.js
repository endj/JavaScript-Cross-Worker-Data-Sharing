const data = n => ({
    "firstName": "eagjidgiiagega".repeat(n),
    "lastName": "agjdadjg".repeat(n),
    "age": "58".repeat(n),
    "date": "2022-01-01".repeat(n),
    "address": "some-street".repeat(n)
})

const smallTestData = data(1)
const mediumTestData = data(10)
const largeTestData = data(100)


class Serializer {
    static serializeSchema = {
        "firstName": 0b000000,
        "lastName": 0b000001,
        "age": 0b000010,
        "date": 0b000011,
        "address": 0b000100
    }

    static serialize = (obj) => {
        const schema = Serializer.serializeSchema;
        const values = Object.values(obj);
        const count = values.length;

        let bufferSize = 0;
        for (let val of values) {
            bufferSize += val.length
        }
        bufferSize += (count * 2)
        const buffer = new Uint16Array(bufferSize);

        let index = 0;
        for (let key of Object.keys(schema)) {
            const val = obj[key]
            const type = schema[key]
            const len = val.length
            // type
            buffer[index++] = type
            // length
            buffer[index++] = len
            // value
            let char = 0;
            while (char != len) {
                buffer[index++] = val.charCodeAt(char++)
            }
        }
        return buffer;
    }
}

class TestRunner {

    static async test(testObject) {
        await TestRunner.warmup(testObject)
        const time = await TestRunner.run(testObject);
        testObject.cleanup()
        return time
    }

    static async warmup(testObject, runs = 10_000) {
        const name = Object.getPrototypeOf(testObject).constructor.name
        console.debug(name, " Strategy Warmup: ", runs)

        const start = performance.now()
        for (let i = 0; i < runs; i++) {
            await testObject.sendAndReceiveOnce();
        }
        const end = performance.now()
        console.debug("Warmup DONE", end - start, "ms")
    }
    static async run(testObject, runs = 10_000) {
        const name = Object.getPrototypeOf(testObject).constructor.name

        const start = performance.now()
        for (let i = 0; i < runs; i++) {
            await testObject.sendAndReceiveOnce()
        }
        const end = performance.now();
        const resultMs = end - start;
        const timePerRun = resultMs / runs;
        const result = `${name} Result:  ${resultMs.toFixed(2)}ms. Time per run ${timePerRun.toFixed(2)}ms`
        TestRunner.writeResult(result)
        return resultMs.toFixed(2)
    }

    static writeResult(text) {
        console.log(text)
        const body = document.getElementsByTagName("body")[0]
        const p = document.createElement("p")
        p.textContent = text;
        body.appendChild(p)
    }

    cleanup() {
        this.worker.terminate()
    }
}

class AbstractStrategy {
    constructor(worker) {
        this.worker = worker
    }
    cleanup() {
        this.worker.terminate()
    }
}

class StructuredCloningStrategy extends AbstractStrategy {
    constructor(testData) {
        super(new Worker("./workers/structuredCloneWorker.js"))
        this.testData = testData;
        this.count = 0;
    }
    async sendAndReceiveOnce() {
        let flag;
        const promise = new Promise((acc, rej) => {
            flag = acc;
        })
        this.worker.postMessage(this.testData)
        this.worker.onmessage = res => {
            const result = res.data
            flag()
        }
        const done = await promise;
    }
}


class TLVBufferCopyStrategy extends AbstractStrategy {
    constructor(testData) {
        super(new Worker("./workers/tlvWorker.js"));
        this.testData = testData
        this.count = 0;
    }

    async test() {
        await this.warmup();
        await this.run();
    }

    async sendAndReceiveOnce() {
        const bytes = Serializer.serialize(this.testData)
        let flag;
        const promise = new Promise((acc, rej) => {
            flag = acc;
        })
        this.worker.postMessage(bytes.buffer, [bytes.buffer])
        this.worker.onmessage = res => {
            flag()
        }
        const done = await promise;
    }
}

class TLVBufferReuseStrategy extends AbstractStrategy {
    constructor(testData) {
        super(new Worker("./workers/tlvWorker.js"));
        this.testData = testData
        this.count = 0;
        this.bytes = Serializer.serialize(this.testData).buffer
    }

    async test() {
        await this.warmup();
        await this.run();
    }

    async sendAndReceiveOnce() {
        let flag;
        const promise = new Promise((acc, rej) => {
            flag = acc;
        })
        this.worker.postMessage(this.bytes, [this.bytes])
        this.worker.onmessage = res => {
            this.bytes = res.data;
            flag()
        }
        const done = await promise;
    }
}

const getName = (obj) => Object.getPrototypeOf(obj).constructor.name

async function compare() {
    let testData = [smallTestData, mediumTestData, largeTestData]
    let dataSize = ["small", "medium", "large"]
    let sizeIndex = 0;

    const results = []

    for (let data of testData) {
        TestRunner.writeResult(`########### Object TestData Size ${dataSize[sizeIndex]} 10_000 runs ###########`)
        const strategies = [
            new StructuredCloningStrategy(data),
            new TLVBufferCopyStrategy(data),
            new TLVBufferReuseStrategy(data)
        ]
        for (let strategy of strategies) {
            const result = await TestRunner.test(strategy)
            results.push({
                time: result,
                size: dataSize[sizeIndex],
                strategy: getName(strategy)
            })
        }
        sizeIndex++;
    }

    const canvas = document.createElement("canvas")
    canvas.id = "canvas"
    canvas.width = "700px"
    document.getElementsByTagName("body")[0].appendChild(canvas)


    const nameMap = {
        "StructuredCloneStrategy": "SC",
        "ReferenceMoveStrategy": "RefMV"
    }
    var xValues = Object.values(results).map(val => val.strategy + " " + val.size);
    var yValues = Object.values(results).map(val => val.time);
    var barColors = "green,red,blue,".repeat(results.length / 2).split(",").filter(s => !!s);

    new Chart("canvas", {
        type: "bar",
        data: {
            labels: xValues,
            datasets: [{
                backgroundColor: barColors,
                data: yValues
            }]
        },
        options: {
            legend: { display: false },
            title: {
                display: true,
                text: "Runtime MS"
            }
        }
    });
}

compare()