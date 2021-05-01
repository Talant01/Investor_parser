const fs = require('fs');
const puppeteer = require('puppeteer')

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

const getData = async (page, id,  profileURL, name ) => {
    try {
        await page.goto(profileURL)
        page.on('console', consoleObj => console.log(consoleObj.text()));
        await page.waitForSelector('profile-section')

        const data = await page.evaluate(() => {
            const camelize = (str) => {
                return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
                    return index === 0 ? word.toLowerCase() : word.toUpperCase();
                }).replace(/\s+/g, '');
            }

            const btnClick = (element) => {
                try {
                    element.click();
                } catch (e) {
                    //console.log('Error: Read more')
                }
            }

            const innerText = (element) => {
                try {
                    return element.innerText
                } catch (e) {
                    //console.log('Error: innerText' + element)
                }
            }

            const checkAttribute = (element) => {
                try {
                    const elem = element.querySelector('a[target=_blank]')
                    if (elem == undefined) return false;
                    return true

                } catch (e) {
                  //  console.log(e)
                    return false
                }
            }

            const data = {
                overview: {},
                personalInvestments: {
                    investments: []
                }
            }
            const baseURL = 'https://www.crunchbase.com';

            const img = document.querySelector('header identifier-image img')
            const overview = document.querySelectorAll('profile-section')[0]
            const readMoreBtn = overview.querySelector('button')
            const items = overview.querySelectorAll('.text_and_value li')

            if (img != undefined)
                data.avatarUrl = img.getAttribute('src')

            btnClick(readMoreBtn)
            data.overview.description = innerText(overview.querySelector('description-card>div'))

            items.forEach((item) => {
                const label = innerText(item.querySelector('label-with-info > span'))
                const valueElement = item.querySelector('field-formatter')
                let value = innerText(valueElement)
                if (checkAttribute(valueElement)) {
                    value = valueElement.querySelector('a[target=_blank]').getAttribute('href')
                }
                try {
                    data.overview[camelize(label)] = value
                } catch (e) {
                    //console.log('Error: item ' + item)
                }
            })

            const investments = document.querySelectorAll('profile-section')[1]
            const headCells = investments.querySelectorAll('table thead tr th')
            const bodyRows = investments.querySelectorAll('table tbody tr')
            const labels = []

            data.personalInvestments.numberOfInvestments = innerText(investments.querySelector('big-values-card field-formatter'))
            data.personalInvestments.description = innerText(investments.querySelector('phrase-list-card'))

            headCells.forEach(cell => {
                const label = camelize(innerText(cell.querySelector('label-with-info')))
                labels.push(label)
            })

            bodyRows.forEach(row => {
                const cells = row.querySelectorAll('td')
                const obj = {}
                cells.forEach((cell, i) => {
                    const value = innerText(cell)
                    obj[labels[i]] = value
                    if (i == 1) {
                        obj.companyURL = baseURL + cell.querySelector('a').getAttribute('href')
                    }
                })
                data.personalInvestments.investments.push(obj)
            })

            return data
        })
        for (let i = 0; i < data.personalInvestments.investments.length; i++) {
            const obj = data.personalInvestments.investments[i]
            await page.goto(obj.companyURL)
            await page.waitForSelector('body')

            const industries = await page.evaluate(() => {
                const industries = document.querySelectorAll('chips-container a')
                const results = []
                if (industries != undefined) {
                    industries.forEach(item => {
                        results.push(item.innerText)
                    })
                }
                return results
            })
            data.personalInvestments.investments[i].industries = industries
        }

        data.name = name
        data.profileURL = profileURL
        data.id = id

        return data
    } catch (e) {
        console.log(e + ' end')
        return getData(page, id,  profileURL, name )
    }
}

const start = async () => {
    const browser = await login()
    const data = JSON.parse(await fs.readFileSync('websites.json'))
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 768 })

    let prevData = JSON.parse(await fs.readFileSync('data1.json'))
    let start = data.length - 1

    if (prevData.length != 0)
        start = prevData[prevData.length - 1].id

    for (let i = start; i >= Math.max(start - 2, 0); i --) {
        console.log(data[i].profileURL + ' - ' + i)
        const curData = await getData(page, i + 1, data[i].profileURL, data[i].name)
        prevData = JSON.parse(await fs.readFileSync('data1.json'))
        prevData.push(curData)
        await fs.writeFileSync('data1.json', JSON.stringify(prevData))
    }
    browser.close()
}

start()
