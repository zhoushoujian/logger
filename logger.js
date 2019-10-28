//made by zhoushoujian on 2018/12/13
let fs = require('fs'),
    time,
    LOG_FILE_MAX_SIZE = 1024 * 1024 * 5,
    LOGGER_LEVEL = ["debug", "info", "warn", "error"],
    list = [],
    flag = true;

//自定义控制台颜色输出
{
    let colors = {
        Reset: "\x1b[0m",
        FgRed: "\x1b[31m",
        FgGreen: "\x1b[32m",
        FgYellow: "\x1b[33m",
        FgBlue: "\x1b[34m"
    };
    "debug:debug:FgBlue,info::FgGreen,warn:警告:FgYellow,error:error:FgRed".split(",").forEach(function (item) {
        let [log, info, color] = item.split(':');
        let logger = function (...args) {
            var m = args.slice(1, args.length - 1).map(function(s){
                return JSON.stringify(s,function(k,v){
                    if (typeof v === 'function') {
                        return Function.prototype.toString.call(v)
                    } else if (Object.prototype.toString.call(v) === '[object Error]'){
                        return v.stack || v.toString()
                    } else {
                        for (var i in v) {
                            var p = v[i];
                            v[i] = p instanceof Function ? String(p) : p instanceof Error ? (v.stack || v.toString()) : p;
                        }
                        if(JSON.stringify(v) === "{}"){
                            console.warn(v)
                            return (`${v.toString()} => {}`)
                        } else {
                            return v;
                        }
                    }
                }, 4)
            });
            process.stdout.write(args[0] + m + args[args.length - 1] + '\n\n')
        } || console[log] || console.log;
        console[log] = (...args) => logger.apply(null, [`${colors[color]}[${getTime()}] [${info.toUpperCase()||log.toUpperCase()}]${colors.Reset} `, ...args, colors.Reset]);
    });
}

function getTime() {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    let day = new Date().getDate();
    let hour = new Date().getHours();
    let minute = new Date().getMinutes();
    let second = new Date().getSeconds();
    let mileSecond = new Date().getMilliseconds();
    if (hour < 10) {
        hour = "0" + hour
    }
    if (minute < 10) {
        minute = "0" + minute
    }
    if (second < 10) {
        second = "0" + second
    }
    if (mileSecond < 10) {
        second = "00" + mileSecond
    }
    if (mileSecond < 100) {
        second = "0" + mileSecond
    }
    time = `${year}-${month}-${day} ${hour}:${minute}:${second}.${mileSecond}`;
    return time;
}

function doLogInFile(buffer) {
    buffer && list.push(buffer);
    flag && activate();
}

function activate() {
    flag = false;
    let buffer = list.shift();
    exec(buffer).then(() => new Promise(res => {
        list.length ? activate() : flag = true;
        res();
    }).catch(err => {
        flag = true;
        console.error('An error happened after execute', err);
    }));
}

function exec(buffer) {
    return checkFileState()
        .then(() => writeFile(buffer))
        .catch(err => console.error('an error happened when execute', err));
}

function checkFileState() {
    return new Promise((resolve) => {
        fs.stat("./server.log", function (err, stats) {
            if (!fs.existsSync("./server.log")) {
                fs.appendFileSync("./server.log");
                resolve();
            } else {
                checkFileSize(stats.size)
                    .then(resolve)
            }
        });
    });
}

function checkFileSize(size) {
    return new Promise((resolve) => {
        if (size > LOG_FILE_MAX_SIZE) {
            fs.readdir(path.join(__dirname) + "/", (err, files) => {
                if (err) throw err;
                let fileList = files.filter(function (file) {
                    return /^server[0-9]*\.log$/i.test(file);
                });

                for (let i = fileList.length; i > 0; i--) {
                    if (i >= 10) {
                        fs.unlinkSync(path.join(__dirname) + "/"  + fileList[i - 1]);
                        continue;
                    }
                    fs.renameSync(path.join(__dirname) + "/"  + fileList[i - 1], "server" + i + ".log");
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

function writeFile(buffer) {
    return new Promise(function (res) {
        fs.writeFileSync("server.log", buffer, {
            flag: "a+" //	以读取追加模式打开文件，如果文件不存在则创建。
        });
        res();
    })
}

/**
 * 初始化日志方法
 * @param {*} InitLogger
 */
function InitLogger() {
    //  console.info("初始化日志系统   ok");
}

function loggerInFile(level, data, ...args) {
    console[level].apply(this, Array.prototype.slice.call(arguments).slice(1));
    let extend = "";
    if (args.length) {
        extend = args.map(s => JSON.stringify(s, function (p, o) {
            if (typeof o === 'function') {
                return Function.prototype.toString.call(o)
            } else if (Object.prototype.toString.call(v) === '[object Error]'){
                return v.stack || v.toString()
            } else {
                for (var k in o) {
                    var v = o[k];
                    o[k] = v instanceof Function ? String(v) : v instanceof Error ? (v.stack || v.toString()) : v;
                }
                if(JSON.stringify(o) === "{}"){
                    console.warn(o)
                    return (`${o.toString()} => {}`)
                } else {
                    return o;
                }
            }
        }, 4));
        if (extend) {
            extend = `  [ext] ${extend}`;
        }
    }
    data = Object.prototype.toString.call(data) === '[object Object]' ? JSON.stringify(data) : data;
    let content = `${data}` + `${extend}` + "\r\n";
    this.time = getTime;
    doLogInFile(`[${this.time()}]  [${level.toUpperCase()}]  ${content}`);
}

LOGGER_LEVEL.reduce(function (total, level, cx) {
    InitLogger.prototype[level] = function (data, ...args) {
        loggerInFile(level, data, ...args);
    }
}, [])

module.exports = logger = new InitLogger();