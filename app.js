"use strict";
const youtubedl = require('youtube-dl');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
class YoutubeDownloader {
    constructor(url) {
        this.path = "./list-urls";
        this.url = url;
    }
    async fetchHtmlFromYoutube() {
        try {
            const browser = await puppeteer.launch({
                headless: false
            });
            const page = await browser.newPage();
            page.setViewport({ width: 1280, height: 926 });
            await page.goto(this.url);
            await this.autoScroll(page);
            const content = await page.content();
            //await browser.close();
            return content;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getListOfUrls(data) {
        const $ = cheerio.load(data);
        let urlsArray = [];
        $('a#thumbnail').each((index, element) => {
            if (!element)
                return;
            urlsArray.push($(element).attr("href"));
        });
        return urlsArray;
    }
    async autoScroll(page) {
        try {
            await page.evaluate(async (_) => {
                await new Promise(async (resolve) => {
                    console.log("ici");
                    let totalHeight = 0;
                    let distance = 400;
                    let interval = 400;
                    let timer = setInterval(() => {
                        let scrollHeight = document.documentElement.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        console.log("scrollHeight", scrollHeight);
                        console.log("totalHeight", totalHeight);
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve(true);
                        }
                    }, interval);
                });
            });
        }
        catch (error) {
            console.log(error);
        }
    }
    async test() {
        const html = await this.fetchHtmlFromYoutube();
        const arrayOfUrls = await this.getListOfUrls(html);
        console.log(arrayOfUrls);
    }
}
const yt = new YoutubeDownloader("https://www.youtube.com/user/IciJapon/videos");
yt.test();
