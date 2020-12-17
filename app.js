"use strict";
const youtubedl = require('youtube-dl');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const pqueue = require('p-queue');
class YoutubeDownloader {
    constructor(url) {
        this.pathArrayUrlsToDownload = "./urlsToDownload.json";
        this.pathArrayDownloaded = "./urlsDownloaded.json";
        this.url = url;
    }
    async fetchHtmlFromYoutube() {
        try {
            const browser = await puppeteer.launch({
                headless: true
            });
            const page = await browser.newPage();
            page.setViewport({ width: 1280, height: 926 });
            await page.goto(this.url);
            await this.autoScroll(page);
            const content = await page.content();
            await browser.close();
            return content;
        }
        catch (error) {
            console.log(error);
        }
    }
    async downloadVideoFromUrl(url) {
        let name;
        const video = youtubedl(url, ['--format=18'], { cwd: __dirname });
        return video.on('info', async (info) => {
            console.log('Download started');
            console.log('filename: ' + info._filename);
            console.log('size: ' + info.size);
            name = info._filename;
            await video.pipe(fs.createWriteStream("videos/" + name));
        });
    }
    async downloadVideosFromArrayOfUrls() {
        const queue = new pqueue.default({ concurrency: 1, autoStart: true });
        const data = fs.readFileSync(this.pathArrayUrlsToDownload);
        const dataParsed = JSON.parse(data);
        for (const url of dataParsed.urls) {
            console.log(url);
            await queue.add(async () => {
                await this.downloadVideoFromUrl(this.url + "" + url);
            });
        }
    }
    buildFetchPromise() {
        const data = fs.readFileSync(this.pathArrayUrlsToDownload);
        const dataParsed = JSON.parse(data);
        return dataParsed.urls.map((url) => this.downloadVideoFromUrl(this.url + "" + url));
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
                    let totalHeight = 0;
                    let distance = 400;
                    let interval = 400;
                    let timer = setInterval(() => {
                        let scrollHeight = document.documentElement.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
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
    async saveToJson(path, contentToAdd, force) {
        if (!fs.existsSync(path))
            fs.writeFileSync(path, '{"urls":[]}');
        let file = fs.readFileSync(path);
        let fileParsed = JSON.parse(file);
        if (contentToAdd.length > 0) {
            contentToAdd.map(item => {
                if (item) {
                    fileParsed.urls.push(item);
                }
            });
        }
        fs.writeFileSync(path, JSON.stringify(fileParsed));
    }
    async getAndSaveUrlsToDownload() {
        const html = await this.fetchHtmlFromYoutube();
        const arrayOfUrls = await this.getListOfUrls(html);
        await this.saveToJson(this.pathArrayUrlsToDownload, arrayOfUrls);
    }
}
const yt = new YoutubeDownloader("https://www.youtube.com/user/IciJapon/videos");
yt.downloadVideosFromArrayOfUrls();
