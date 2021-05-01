const fs = require('fs');
const puppeteer = require('puppeteer')

const chars = [];

function init() {
    console.log()
    for (let i = 'a'; i <= 'z';) {
        for (let j = 'a'; j <= 'z';) {
            const pat = i + j;
            chars.push(pat)
            j = String.fromCharCode(j.charCodeAt(0) + 1)
        }
        i = String.fromCharCode(i.charCodeAt(0) + 1)
    }
}

async function login() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 10
    });

    const loginPage = await browser.newPage()

    await loginPage.goto('https://www.crunchbase.com/login')
    await loginPage.waitForSelector('login')
    await loginPage.type('input[name=email]', 'wakemos542@sumwan.com', { delay: 20 })
    await loginPage.type('input[name=password]', '2021angelmatcH', { delay: 20 })
    await loginPage.keyboard.press(String.fromCharCode(13))
    await loginPage.waitForTimeout(2000)
    await loginPage.close()
    return browser
}

async function getData(page, id) {
    try {

        await page.waitForTimeout(3000);
        const data = await page.evaluate((id) => {
            const baseURL = 'https://www.crunchbase.com';
            const data = []

            const rows = document.querySelectorAll('grid-row')
            rows.forEach(row => {
                const col = row.querySelectorAll('grid-cell')[1];
                const target = col.querySelector('a');

                const res = {};
                res.name = target.getAttribute('title')
                res.profileURL = baseURL + target.getAttribute('href')
                res.id = id++;
                data.push(res);
            })

            return data;
        }, id)
        return data
    } catch (e) {
        console.log(e);
    }

}

const start = async () => {
    const browser = await login()

    let id = 1
    let URL = 'https://www.crunchbase.com/lists/investor-people/14041389-1b2d-4196-99e9-0c63f6b2541a/people'
    const page = await browser.newPage()

    await page.setViewport({ width: 1200, height: 768 })
    await page.goto(URL);
    await page.waitForSelector('.component--results-info');

    for (let i = 478; i < chars.length; i++) {
        console.log(i + ' - ' + chars[i])
        const pattern = chars[i];
        async function calc() {

            const filter = async (pattern) => {
                await page.waitForSelector('input[id=mat-input-2]')
                await page.type('input[id=mat-input-2]', pattern, { delay: 20 })
                await page.keyboard.press(String.fromCharCode(13))
                await page.waitForSelector('.component--results-info');
            }
            await filter(pattern)

            while (true) {
                const data = await getData(page, id)
                const prevData = JSON.parse(await fs.readFileSync('websites.json'))
                const newData = [...prevData, ...data];
                fs.writeFileSync('websites.json', JSON.stringify(newData));
                id = newData.length + 1;

                const flag = await page.evaluate(() => {
                    let flag = false
                    const elem = document.querySelectorAll('a[aria-label=Next]')[1]
                    if (elem == undefined || "true" == elem.getAttribute('aria-disabled'))
                        flag = true
                    return flag
                })
                if (flag == true) break
                else {
                    let elem = await page.$$('a[aria-label="Next"]')
                    await elem[1].click()
                    await page.waitForTimeout(2000)
                }
            }
            await page.reload()
        }
        await calc();
    }
    await browser.close();
}

init();
start();

