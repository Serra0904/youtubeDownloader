const youtubedl = require('youtube-dl');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

interface IyoutubeDownloader {
    url: string;
}

class YoutubeDownloader implements IyoutubeDownloader {
    public url;
    private path = "./list-urls";

    constructor(url: string) {
        this.url = url;
    }

    private async fetchHtmlFromYoutube() {
        try {
            const browser = await puppeteer.launch({
                headless: true
            });
            const page = await browser.newPage();
            page.setViewport({width: 1280, height: 926});
            await page.goto(this.url);
            await this.autoScroll(page);
            const content = await page.content();
            await browser.close();

            return content;
        } catch (error) {
            console.log(error);
        }
    }

    private async getListOfUrls(data: string) {
        const $ = cheerio.load(data);
        let urlsArray: Array<string> = [];
        $('a#thumbnail').each((index: number, element: string) => {
            if (!element) return;
            urlsArray.push($(element).attr("href"));
        })
        return urlsArray;
    }

    private async autoScroll(page: any) {
        try {
            await page.evaluate(async (_: any) => {
                    await new Promise(async (resolve) => {
                        console.log("ici");
                        let totalHeight = 0
                        let distance = 400
                        let interval = 400
                        let timer = setInterval(() => {
                            let scrollHeight = document.documentElement.scrollHeight;
                            window.scrollBy(0, distance)
                            totalHeight += distance
                            if (totalHeight >= scrollHeight) {
                                clearInterval(timer)
                                resolve(true)
                            }
                        }, interval)
                    })
                }
            )
        } catch (error) {
            console.log(error);
        }
    }

    public async test() {
        const html = await this.fetchHtmlFromYoutube();
        const arrayOfUrls = await this.getListOfUrls(html);
        console.log(arrayOfUrls);
    }
}


const yt = new YoutubeDownloader("https://www.youtube.com/user/IciJapon/videos");

yt.test();
