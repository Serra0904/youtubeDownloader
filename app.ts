const youtubedl = require('youtube-dl');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const pqueue = require('p-queue');
const readline = require('readline');

interface IyoutubeDownloader {
    url: string;
}

class YoutubeDownloader implements IyoutubeDownloader {
    public url;
    private pathArrayUrlsToDownload = "./urlsToDownload.json";
    private pathArrayDownloaded = "./urlsDownloaded.json";

    constructor(url: string) {
        this.url = url;
    }

    /**
     * Télécharge le html d'une page youtube passée dans le constructeur
     * @private
     */
    private async fetchHtmlFromYoutube(): Promise<any> {
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

    /**
     * Télécharge le fichier MP4 d'une vidéo youtube
     * @param url
     * @param endOfUrl
     */
    public async downloadVideoFromUrl(url: string, endOfUrl: string): Promise<void> {
        return new Promise((resolve: any) => {
            let name: string;
            const video = youtubedl(url, ['--format=18'], {cwd: __dirname})
            video.on('info', (info: any) => {
                console.log('Download started...')
                console.log('filename: ' + info._filename)
                console.log('size: ' + info.size)
                name = info._filename;
                video.pipe(fs.createWriteStream("videos/" + name))
            })
            video.on('end', () => {
                console.log('Download finished...')
                this.saveToJson(this.pathArrayDownloaded, [endOfUrl])
                resolve()
            });
        })

    }

    /**
     * Va mettre en queueu la liste des vidéos à télécharger
     */
    public async downloadVideosFromArrayOfUrls(): Promise<void> {
        const queue = new pqueue.default({concurrency: 1, autoStart: true});
        const data = fs.readFileSync(this.pathArrayUrlsToDownload);
        const dataParsed = JSON.parse(data);
        try {
            dataParsed.urls.forEach((url: string) => {
                if (this.haveUrlAlreadyDownloaded(url)) {
                    console.log("déjà téléchargé, je passe..");
                    return;
                } else {
                    queue.add(async () => {
                        await this.downloadVideoFromUrl(this.url + "" + url, url);
                    });
                }
            })
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Vérifie si la vidéo à déjà été téléchargée ou pas
     * @param url
     * @private
     */
    private haveUrlAlreadyDownloaded(url: string): boolean {
        const data = fs.readFileSync(this.pathArrayDownloaded);
        const dataParsed = JSON.parse(data);
        return dataParsed.urls.includes(url);
    }


    /**
     * Récupère le nom de toutes les vidéos à télécharger
     * @param data
     * @private
     */
    private async getListOfUrls(data: string): Promise<Array<string>> {
        const $ = cheerio.load(data);
        let urlsArray: Array<string> = [];
        $('a#thumbnail').each((index: number, element: string) => {
            if (!element) return;
            console.log("lien de la vidéo : ", $(element).attr("href"))
            urlsArray.push($(element).attr("href"));
        })
        return urlsArray;
    }

    /**
     * Va scroll la page automatiquement afin de charger toutes les vidéos sur youtube
     * @param page
     * @private
     */
    private async autoScroll(page: any): Promise<void> {
        try {
            await page.evaluate(async (_: any) => {
                    await new Promise(async (resolve) => {
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

    /**
     * Enregistre la liste des noms dans un fichier json
     * @param path
     * @param contentToAdd
     * @param force
     * @private
     */
    private async saveToJson(path: string, contentToAdd: Array<string>, force?: false): Promise<void> {
        if (!fs.existsSync(path)) fs.writeFileSync(path, '{"urls":[]}');
        let file = fs.readFileSync(path);
        let fileParsed = JSON.parse(file);

        if (contentToAdd.length > 0) {
            contentToAdd.map(item => {
                if (item) {
                    fileParsed.urls.push(item);
                }
            })
        }
        fs.writeFileSync(path, JSON.stringify(fileParsed));

    }

    private isUrlValid(url: string): boolean {
        const protocol = url.slice(0, 8);
        const domain = url.slice(8, 23);
        if (protocol === "https://" && domain === "www.youtube.com") return true;
        return false
    }

    /**
     * `Télécharge la page et retourne la liste des vidéos à télécharger
     */
    public async getAndSaveUrlsToDownload() {
        const html = await this.fetchHtmlFromYoutube();
        const arrayOfUrls = await this.getListOfUrls(html);
        await this.saveToJson(this.pathArrayUrlsToDownload, arrayOfUrls);
    }
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let url = ""

const question1 = () => {
    return new Promise((resolve: any) => {
        rl.question('Bonjour, quelle est la chaîne youtube que vous souhaitez télécharger ? ', async (answer: string) => {
            const yt = new YoutubeDownloader(`${answer}`);
            url = answer;
            console.log(`Initialisation...`);
            setTimeout(() => {
                console.log('.....');
            }, 1000)
            setTimeout(() => {
                console.log('.....');
            }, 2000)
            setTimeout(() => {
                console.log('Téléchargement de la liste des vidéos...')
            }, 3000)
            await yt.getAndSaveUrlsToDownload();
            console.log('Liste enregisté dans le fichier urlsToDownload.json')
            console.log(`Le programme va enregistrer toutes le nom de toutes les vidéos que vous avez téléchargé, 
                         vous pouvez donc stopper le robot à tout moment, et reprendre à où vous en etiez.
                        `);
            resolve()
        })
    })
}
const question2 = () => {
    return new Promise((resolve: any) => {
        rl.question('Souhaitez-vous démarrer le téléchargement ? ', async (answer: string) => {
            const yt = new YoutubeDownloader(url);
            switch (answer) {
                case("oui"):
                    await yt.downloadVideosFromArrayOfUrls();
                    resolve();
                    break;
                case("no"):
                    console.log("Fin du programme.")
                    resolve();
            }

        });
    });
}

const main = async () => {
    await question1()
    await question2()
    rl.close()
}

main();




