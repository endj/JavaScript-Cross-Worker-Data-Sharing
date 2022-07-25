const smallTestData = Array(10).fill().map(() => Math.round(Math.random() * 1000))
const mediumTestData = Array(1000).fill().map(() => Math.round(Math.random() * 1000))
const largeTestData = Array(5000).fill().map(() => Math.round(Math.random() * 1000))


class TestRunner {

    static async test(testObject) {
        await TestRunner.warmup(testObject)
        const result = await TestRunner.run(testObject);
        console.log(testObject.sum())
        testObject.cleanup()
        return result;
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
        return resultMs.toFixed(2);
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
        this.worker = worker;
    }
    cleanup() {
        this.worker.terminate();
    }


}
class ReferenceMoveStrategy extends AbstractStrategy {

    constructor(data) {
        super(new Worker("./workers/moveReferenceWorker.js"))
        this.data = Uint32Array.from(data).buffer
    }

    async sendAndReceiveOnce() {
        let flag;
        const promise = new Promise((acc, rej) => {
            flag = acc;
        })
        this.worker.postMessage(this.data, [this.data])
        this.worker.onmessage = res => {
            this.data = res.data
            flag()
        }
        const done = await promise;
    }

    sum() {
        let numbers = new Uint32Array(this.data)
        let sum = 0;
        for (let num of numbers) {
            sum += num
        }
        return sum
    }
}

class StructuredCloneStrategy extends AbstractStrategy {
    constructor(data) {
        super(new Worker("./workers/structuredCloneWorker.js"))
        this.data = data;
    }

    async sendAndReceiveOnce() {
        let flag;
        const promise = new Promise((acc, rej) => {
            flag = acc;
        })
        this.worker.postMessage(this.data)
        this.worker.onmessage = res => {
            this.data = res.data
            flag()
        }
        const done = await promise;
    }

    sum() {
        return this.data.reduce((acc, val) => acc + val, 0)
    }
}


const getName = (obj) => Object.getPrototypeOf(obj).constructor.name

async function compare() {
    let testData = [smallTestData, mediumTestData, largeTestData]

    const results = []

    for (let data of testData) {
        TestRunner.writeResult(`########### Array TestData  ${data.length} ###########`)
        const strategies = [
            new ReferenceMoveStrategy(data),
            new StructuredCloneStrategy(data)
        ]

        for (let strategy of strategies) {
            const result = await TestRunner.test(strategy)
            results.push({
                time: result,
                size: data.length,
                strategy: getName(strategy)
            })
        }
    }


    const canvas = document.createElement("canvas")
    canvas.id = "canvas"
    canvas.width = "700px"
    document.getElementsByTagName("body")[0].appendChild(canvas)


    const nameMap = {
        "StructuredCloneStrategy": "SC",
        "ReferenceMoveStrategy": "RefMV"
    }
    var xValues = Object.values(results).map(val => nameMap[val.strategy] + " " + val.size);
    var yValues = Object.values(results).map(val => val.time);
    var barColors = "green,red,".repeat(results.length / 2).split(",").filter(s => !!s);

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