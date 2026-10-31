/*
脚本修改、參考自 @CyWr110 , @githubdulong , @Saga
修改日期：2024.10.16
 ---------------------------------------
 */

const REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36', // 用戶代理，標識瀏覽器類型
    'Accept-Language': 'en', // 接受的語言，這裡設置為英語
    'Accept': '*/*', // 添加 Accept 頭，表示接受所有類型的內容
    'Referer': 'https://chat.openai.com/', // 添加 Referer 頭，表示請求來源
};


const STATUS_COMING = 2; // 即將登陸
const STATUS_AVAILABLE = 1; // 支持解鎖
const STATUS_NOT_AVAILABLE = 0; // 不支持解鎖
const STATUS_TIMEOUT = -1; // 檢測超時
const STATUS_ERROR = -2; // 檢測異常

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36';
const ipApiUrl = "https://ipinfo.io/json"; // IP获取API

let args = getArgs(); // 獲取參數

(async () => {
    let now = new Date(); // 獲取當前日期和時間
    let hour = now.getHours(); // 獲取當前小時
    let minutes = now.getMinutes(); // 獲取當前分鐘
    hour = hour > 9 ? hour : "0" + hour; // 小於10的時數補零
    minutes = minutes > 9 ? minutes : "0" + minutes; // 小於10的分鐘補零

    // 初始化面板，顯示當前時間
    let panel_result = {
        title: `${args.title} | ${hour}:${minutes}` || `解鎖檢測 | ${hour}:${minutes}`, // 設置標題
        content: '', // 設置內容
        icon: args.icon || 'play.tv.fill', // 設置圖標
        'icon-color': args.color || '#FF2D55', // 設置圖標顏色
    };

    let notificationContent = ""; // 通知內容

// 獲取 IP 資訊並將其添加到面板
try {
    const ipData = await fetchData(ipApiUrl); // 獲取 IP 資料
    const ipInfo = JSON.parse(ipData); // 解析 IP 資料為 JSON 格式
    const ipAddress = `IP: ${ipInfo.ip}  📍: ${ipInfo.region}, ${ipInfo.country}`; // 構建 IP 地址字串
    panel_result.content = `${ipAddress}\n`; // 將 IP 添加到面板內容的第一行
    notificationContent += `IP: ${ipInfo.ip}  📍: ${ipInfo.city}, ${ipInfo.country}\n`; // 將 IP 資訊添加到通知內容
} catch (error) {
    panel_result.content = "IP: N/A\n"; // 如果無法獲取 IP，則處理錯誤
    notificationContent += "IP: N/A\n"; // 將錯誤資訊添加到通知內容
}


// 同時檢查多個服務
let [{ region, status }] = await Promise.all([testDisneyPlus()]); // 同時檢查 Disney+ 的狀態
await Promise.all([check_chatgpt(), check_youtube_premium(), check_netflix()]) // 同時檢查 ChatGPT、YouTube Premium 和 Netflix
    .then((result) => {
        let disney_result = getServiceStatus(status, region, "Disney"); // 獲取 Disney+ 的服務狀態
        result.push(disney_result); // 將 Disney+ 的結果添加到結果陣列中

        let youtube_netflix = [result[1], result[2]].join('  \t|  '); // 將 YouTube 和 Netflix 的結果合併
        let chatgpt_disney = [result[0], result[3]].join('  \t|  '); // 將 ChatGPT 和 Disney 的結果合併

        // 更新面板內容，顯示服務狀態結果
        panel_result.content += youtube_netflix + '\n' + chatgpt_disney;

        // 將解鎖結果添加到通知內容
        notificationContent += `${youtube_netflix}\n`;
        notificationContent += `${chatgpt_disney}`;
    })
    .finally(() => {
        // 發送包含所有結果的通知
        $notification.post(`检测完成  |  ${hour}:${minutes}`, "", notificationContent); // 發送通知
        $done(panel_result); // 顯示最終的面板結果
    });
})();


// 幫助函數，用於處理每個服務的解鎖狀態
function getServiceStatus(status, region, serviceName) {
    if (status == STATUS_COMING) { // 如果狀態是即將到來
        return `${serviceName} ➟\u2009🔜\u2009${region}`; // 返回即將可用的服務狀態
    } else if (status == STATUS_AVAILABLE) { // 如果狀態是可用
        return `${serviceName} ➟\u2009✅\u2009${region}`; // 返回可用的服務狀態
    } else if (status == STATUS_NOT_AVAILABLE) { // 如果狀態是不可用
        return `${serviceName} ➟\u2009❌`; // 返回不可用的服務狀態
    } else if (status == STATUS_TIMEOUT) { // 如果狀態是超時
        return `${serviceName} ➟\u2009N/A`; // 返回超時的服務狀態
    } else {
        return `${serviceName} ➟\u2009N/A`; // 返回未知狀態的服務狀態
    }
}

// 從給定的 URL 獲取數據
function fetchData(url) {
    return new Promise((resolve, reject) => {
        $httpClient.get({ url, headers: REQUEST_HEADERS }, (error, response, data) => {
            if (error || response.status !== 200) { // 如果出現錯誤或狀態碼不是 200
                reject(error || '请求失败'); // 拒絕 Promise，返回錯誤信息
            } else {
                resolve(data); // 成功獲取數據，解析 Promise
            }
        });
    });
}

// ... [保持您現有的服務檢查函數，如 ChatGPT、YouTube、Netflix、Disney+ 在此處]

// 獲取並解析 URL 中的參數
function getArgs() {
    return Object.fromEntries( // 將鍵值對轉換為對象
        $argument.split("&") // 以 & 分隔參數
            .map(item => item.split("=")) // 將每個參數以 = 分隔為鍵值對
            .map(([k, v]) => [k, decodeURIComponent(v)]) // 解碼每個值
    );
}

// 檢測 ChatGPT
async function check_chatgpt() {
    // Web 檢測
    let inner_check_web = () => {
        return new Promise((resolve, reject) => {
            let option = {
                url: 'http://chat.openai.com/cdn-cgi/trace', // 設置請求的 URL
                headers: REQUEST_HEADERS, // 設置請求的標頭
            };
            $httpClient.get(option, function (error, response, data) {
                if (error != null || response.status !== 200) { // 檢查是否有錯誤或狀態碼不是 200
                    reject('Error'); // 拒絕 Promise
                    return;
                }

                let lines = data.split("\n"); // 將返回的數據按行分割
                let cf = lines.reduce((acc, line) => { // 將每一行轉換為鍵值對
                    let [key, value] = line.split("="); // 按 = 分割每行
                    acc[key] = value; // 將鍵值對添加到累加器
                    return acc;
                }, {});

                let country_code = cf.loc; // 獲取國家代碼
                let restricted_countries = ['HK', 'RU', 'CN', 'KP', 'CU', 'IR', 'SY']; // 限制國家列表
                if (restricted_countries.includes(country_code)) { // 檢查是否在限制國家列表中
                    resolve({ status: 'Not Available', region: '' }); // 返回不可用狀態
                } else {
                    resolve({ status: 'Available', region: country_code.toUpperCase() }); // 返回可用狀態
                }
            });
        });
    };

    // iOS 客戶端檢測
    let inner_check_ios = () => {
        return new Promise((resolve, reject) => {
            let option = {
                url: 'https://ios.chat.openai.com/', // 設置請求的 URL
                headers: {
                    'authority': 'ios.chat.openai.com',
                    'accept': '*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'accept-language': 'en-US,en;q=0.9',
                    'sec-ch-ua': '',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"iOS"',  // 這裡設置為 iOS
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'user-agent': '' // 可以根據需要填寫 user-agent
                }
            };
            $httpClient.get(option, function (error, response, data) {
                if (error) {
                    const errorMsg = "ChatGPT: 檢測失敗 (網絡連接問題 - VPN 請求)"; // 錯誤信息
                    console.log(errorMsg);
                    resolve('Client Error'); // 返回客戶端錯誤
                    return;
                }

                console.log("ChatGPT: 已收到 VPN 請求的響應。");
                const vpnDetected = data.toLowerCase().includes('vpn'); // 檢查響應中是否包含 'vpn'
                console.log(`VPN 檢測響應: ${data}`);

                if (vpnDetected) {
                    resolve('Client Not Available'); // 如果檢測到 VPN，返回不可用
                } else {
                    resolve('Client Available'); // 否則，返回可用
                }
            });
        });
    };

    let check_result = 'ChatGPT➟ '; // 初始化檢查結果

    try {
        // 同時檢測 Web 和 iOS 客戶端
        const [webResult, iosResult] = await Promise.all([inner_check_web(), inner_check_ios()]);
        console.log("Web Result:", webResult);
        console.log("iOS Result:", iosResult);

        // 根據檢查結果生成最終返回內容
        if (webResult.status === 'Available' && iosResult === 'Client Available') {
            check_result += `✅\u2009${webResult.region}`; // Web 和 iOS 都可用
        } else if (webResult.status === 'Available' && iosResult === 'Client Not Available') {
            check_result += `⚠️\u2009${webResult.region}  `; // Web 可用，但 iOS 不可用
        } else {
            check_result += '❌     '; // 都不可用
        }
    } catch (error) {
        console.log("Error:", error);
        check_result += ' N/A    \u2009'; // 發生錯誤，返回 N/A
    }

    return check_result; // 返回檢查結果
}

// 檢測 YouTube Premium
async function check_youtube_premium() {
    let inner_check = () => {
        return new Promise((resolve, reject) => {
            let option = {
                url: 'https://www.youtube.com/premium', // 設置請求的 URL
                headers: REQUEST_HEADERS, // 設置請求的標頭
            }
            $httpClient.get(option, function (error, response, data) {
                if (error != null || response.status !== 200) { // 檢查是否有錯誤或狀態碼不是 200
                    reject('Error'); // 拒絕 Promise
                    return;
                }

                if (data.indexOf('Premium is not available in your country') !== -1) { // 檢查返回的數據是否包含 Premium 不可用的信息
                    resolve('Not Available'); // 返回不可用
                    return;
                }

                let region = ''; // 初始化地區變量
                let re = new RegExp('"countryCode":"(.*?)"', 'gm'); // 定義正則表達式以提取國家代碼
                let result = re.exec(data); // 在數據中執行正則表達式匹配
                if (result != null && result.length === 2) { // 如果匹配成功
                    region = result[1].toUpperCase(); // 獲取國家代碼並轉為大寫
                } else if (data.indexOf('www.google.cn') !== -1) { // 如果數據中包含 www.google.cn
                    region = 'CN'; // 返回中國地區代碼
                } else {
                    region = 'US'; // 默認為美國地區代碼
                }
                resolve(region); // 返回地區代碼
            });
        });
    }

    let youtube_check_result = 'YouTube ➟ '; // 初始化檢查結果

    await inner_check() // 執行內部檢查
        .then((code) => {
            if (code === 'Not Available') {
                youtube_check_result += '❌     \u2009'; // 如果不可用，添加標記
            } else {
                youtube_check_result += '✅\u2009' + code; // 如果可用，添加標記和地區代碼
            }
        })
        .catch((error) => {
            youtube_check_result += '\u2009N/A   '; // 發生錯誤，返回 N/A
        });

    return youtube_check_result; // 返回檢查結果
}

// 檢測 Netflix
async function check_netflix() {
    let inner_check = (filmId) => {
        return new Promise((resolve, reject) => {
            let option = {
                url: 'https://www.netflix.com/title/' + filmId, // 設置請求的 URL
                headers: REQUEST_HEADERS, // 設置請求的標頭
            }
            $httpClient.get(option, function (error, response, data) {
                if (error != null) { // 檢查是否有錯誤
                    reject('Error'); // 拒絕 Promise
                    return;
                }

                if (response.status === 403) { // 檢查是否為 403 錯誤
                    reject('Not Available'); // 返回不可用
                    return;
                }

                if (response.status === 404) { // 檢查是否為 404 錯誤
                    resolve('Not Found'); // 返回未找到
                    return;
                }

                if (response.status === 200) { // 檢查是否為 200 成功響應
                    let url = response.headers['x-originating-url']; // 獲取原始 URL
                    let region = url.split('/')[3]; // 提取地區
                    region = region.split('-')[0]; // 分割並獲取地區代碼
                    if (region == 'title') { // 如果地區為 title
                        region = 'US'; // 設置為美國
                    }
                    if (region != null) { // 如果有地區代碼
                        region = region.toUpperCase(); // 轉為大寫
                    }
                    resolve(region); // 返回地區代碼
                    return;
                }

                reject('Error'); // 其他情況返回錯誤
            });
        });
    }

    let netflix_check_result = 'Netflix ➟ '; // 初始化檢查結果

    await inner_check(81280792) // 檢查第一個電影 ID
        .then((code) => {
            if (code === 'Not Found') { // 如果未找到，檢查第二個電影 ID
                return inner_check(80018499);
            }
            netflix_check_result += '✅\u2009' + code; // 如果可用，添加標記和地區代碼
            return Promise.reject('BreakSignal'); // 中斷信號
        })
        .then((code) => {
            if (code === 'Not Found') { // 如果未找到，返回不可用
                return Promise.reject('Not Available');
            }

            netflix_check_result += '⚠️\u2009' + code; // 如果可用但有警告，添加標記和地區代碼
            return Promise.reject('BreakSignal'); // 中斷信號
        })
        .catch((error) => {
            if (error === 'BreakSignal') {
                return; // 如果是中斷信號則返回
            }
            if (error === 'Not Available') {
                netflix_check_result += '❌'; // 返回不可用
                return;
            }
            netflix_check_result += 'N/A'; // 返回 N/A
        });

    return netflix_check_result; // 返回檢查結果
}

// 檢測 Disney+
async function testDisneyPlus() {
    try {
        let { region, cnbl } = await Promise.race([testHomePage(), timeout(7000)]); // 同時檢測首頁和超時

        let { countryCode, inSupportedLocation } = await Promise.race([getLocationInfo(), timeout(7000)]); // 同時獲取地理位置信息和超時

        region = countryCode ?? region; // 如果 countryCode 存在，則使用它

        if (region != null) {
            region = region.toUpperCase(); // 轉為大寫
        }

        // 即將登陸
        if (inSupportedLocation === false || inSupportedLocation === 'false') {
            return { region, status: STATUS_COMING }; // 返回即將登陸的狀態
        } else {
            return { region, status: STATUS_AVAILABLE }; // 返回可用的狀態
        }

    } catch (error) {
        if (error === 'Not Available') {
            return { status: STATUS_NOT_AVAILABLE }; // 返回不可用的狀態
        }

        if (error === 'Timeout') {
            return { status: STATUS_TIMEOUT }; // 返回超時的狀態
        }

        return { status: STATUS_ERROR }; // 返回錯誤的狀態
    }
}

// 獲取位置信息
function getLocationInfo() {
    return new Promise((resolve, reject) => {
        let opts = {
            url: 'https://disney.api.edge.bamgrid.com/graph/v1/device/graphql', // 請求的 URL
            headers: {
                'Accept-Language': 'en', // 設置接受的語言
                Authorization: 'ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84', // 設置授權標頭
                'Content-Type': 'application/json', // 設置請求內容類型
                'User-Agent': UA, // 設置用戶代理
            },
            body: JSON.stringify({
                query: 'mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }', // GraphQL 查詢
                variables: {
                    input: {
                        applicationRuntime: 'chrome', // 應用運行環境
                        attributes: {
                            browserName: 'chrome', // 瀏覽器名稱
                            browserVersion: '94.0.4606', // 瀏覽器版本
                            manufacturer: 'apple', // 製造商
                            model: null, // 型號
                            operatingSystem: 'macintosh', // 操作系統
                            operatingSystemVersion: '10.15.7', // 操作系統版本
                            osDeviceIds: [], // 設備 ID
                        },
                        deviceFamily: 'browser', // 設備類別
                        deviceLanguage: 'en', // 設備語言
                        deviceProfile: 'macosx', // 設備配置文件
                    },
                },
            }),
        }

        $httpClient.post(opts, function (error, response, data) {
            if (error) {
                reject('Error'); // 拒絕 Promise
                return;
            }

            if (response.status !== 200) {
                reject('Not Available'); // 返回不可用
                return;
            }

            data = JSON.parse(data); // 解析返回的 JSON 數據
            if (data?.errors) {
                reject('Not Available'); // 返回不可用
                return;
            }

            let {
                token: { accessToken }, // 獲取訪問令牌
                session: {
                    inSupportedLocation, // 獲取是否在支持的位置
                    location: { countryCode }, // 獲取國家代碼
                },
            } = data?.extensions?.sdk;
            resolve({ inSupportedLocation, countryCode, accessToken }); // 返回結果
        });
    });
}

// 測試首頁可用性
function testHomePage() {
    return new Promise((resolve, reject) => {
        let opts = {
            url: 'https://www.disneyplus.com/', // 請求的 URL
            headers: {
                'Accept-Language': 'en', // 設置接受的語言
                'User-Agent': UA, // 設置用戶代理
            },
        }

        $httpClient.get(opts, function (error, response, data) {
            if (error) {
                reject('Error'); // 拒絕 Promise
                return;
            }
            if (response.status !== 200 || data.indexOf('Sorry, Disney+ is not available in your region.') !== -1) {
                reject('Not Available'); // 返回不可用
                return;
            }

            let match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/); // 正則表達式匹配地區和 CNBL
            if (!match) {
                resolve({ region: '', cnbl: '' }); // 返回空值
                return;
            }

            let region = match[1]; // 獲取地區
            let cnbl = match[2]; // 獲取 CNBL
            resolve({ region, cnbl }); // 返回結果
        });
    });
}

// 超時函數
function timeout(delay = 5000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject('Timeout'); // 拒絕 Promise，返回超時
        }, delay);
    });
}

// 獲取圖標
function getIcon(code, icons) {
    if (code != null && code.length === 2) { // 檢查代碼是否存在且長度為 2
        for (let i = 0; i < icons.length; i++) { // 遍歷圖標數組
            if (icons[i][0] === code) { // 如果找到匹配的代碼
                return icons[i][1] + code; // 返回圖標加代碼
            }
        }
    }
    return code; // 返回代碼
}
