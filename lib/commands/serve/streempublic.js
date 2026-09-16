const https = require('https');
const fs = require('fs');
const path = require('path');
const zipper = require('adm-zip');
const { warn, error } = require('@vue/cli-shared-utils');

const requestHead = (url) => new Promise((resolve, reject) => {
    const request = https.request(url, { method: 'HEAD' }, (response) => {
        response.resume();
        resolve(response);
    });
    request.on('error', reject);
    request.end();
});

const getFile = (url, dest, { totalBytes, resumable }) => new Promise((resolve, reject) => {
    const terminalWidth = process.stdout.columns || 80;
    const BASE_DOWNLOAD_MESSAGE = 'Downloading MainFrame Xpublic Zip: 100.00% []';
    const MIN_BAR_LENGTH = 10;
    const percentFormatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const startByte = resumable && fs.existsSync(dest) ? fs.statSync(dest).size : 0;
    if (!isNaN(totalBytes) && startByte >= totalBytes) {
        resolve();
        return;
    }

    let downloadedBytes = startByte;
    const requestOptions = startByte > 0 ? { headers: { Range: `bytes=${startByte}-` } } : {};

    const request = https.get(url, requestOptions, function (response) {
        const isResuming = startByte > 0 && response.statusCode === 206;
        if (startByte > 0 && !isResuming) {
            downloadedBytes = 0;
        }
        const file = fs.createWriteStream(dest, { flags: isResuming ? 'a' : 'w' });

        response.on('data', (chunk) => {
            downloadedBytes += chunk.length;

            if (!isNaN(totalBytes)) {
                if (downloadedBytes < totalBytes) {
                    const downloadedPercentage = downloadedBytes / totalBytes;
                    const formattedDownloadPercentage = percentFormatter.format(downloadedPercentage);
                    const barLength = Math.max(MIN_BAR_LENGTH, terminalWidth - BASE_DOWNLOAD_MESSAGE.length);
                    const filledLength = Math.round(barLength * downloadedPercentage);
                    const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);

                    process.stdout.write(`\rDownloading MainFrame Xpublic Zip: ${formattedDownloadPercentage} [${bar}]`);
                } else {
                    process.stdout.write('\n');
                }
            }
        });

        response.pipe(file);
        response.on('error', (err) => {
            file.close();
            reject(err);
        });

        file.on('error', (err) => {
            file.close(() => reject(err));
        });
        file.on('finish', function () {
            file.close(() => resolve());
        });
    }).on('error', function (err) {
        error('Main Frame URL could not be found. Please make sure .development.env file has the correct MAINFRAME_URL settings.');
        error(err);
        reject(err);
    });
});

const MAX_CONSECUTIVE_FAILURES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadWithRetry = async (url, dest, opts) => {
    let consecutiveFailures = 0;

    while (true) {
        const sizeBefore = fs.existsSync(dest) ? fs.statSync(dest).size : 0;

        try {
            await getFile(url, dest, opts);
            return;
        } catch (err) {
            const sizeAfter = fs.existsSync(dest) ? fs.statSync(dest).size : 0;

            consecutiveFailures = sizeAfter > sizeBefore ? 0 : consecutiveFailures + 1;

            warn(`MainFrame Xpublic indirmesi kesildi (deneme ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${err.message}`);

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                throw new Error(`MainFrame Xpublic, ${MAX_CONSECUTIVE_FAILURES} kez üst üste ilerleme kaydedilmeden indirilemedi.`);
            }

            await sleep(RETRY_DELAY_MS);
        }
    }
};

exports.prapereDevPub = async function (api, pubzipurl) {

    const sfConfig = require(api.resolve('sf.config.js'));

    const remoteUrl = sfConfig.mainFrameUrl + '/' + pubzipurl;
    const localzipfile = path.resolve(__dirname, pubzipurl);
    const metaFile = localzipfile + '.meta.json';
    const destiny = path.resolve(__dirname + '/devpub');

    let head = null;
    try {
        head = await requestHead(remoteUrl);
    } catch (err) {
        warn(`MainFrame Xpublic sunucusuna ulaşılamadı (${err.message}).`);
    }

    if (!head) {
        if (!fs.existsSync(localzipfile)) {
            throw new Error('MainFrame Xpublic indirilemedi ve kullanılabilecek yerel bir kopya yok.');
        }
        warn('Sunucu güncelliği doğrulanamadı, mevcut yerel Xpublic kopyası kullanılacak.');
    } else {
        const remoteEtag = head.headers['etag'] || head.headers['last-modified'] || null;
        const remoteSize = head.headers['content-length'] ? parseInt(head.headers['content-length'], 10) : NaN;
        const acceptsRanges = head.headers['accept-ranges'] === 'bytes';

        let cachedMeta = null;
        if (fs.existsSync(metaFile)) {
            try {
                cachedMeta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
            } catch (err) {
                cachedMeta = null;
            }
        }

        const sameRemoteVersion = !!cachedMeta && cachedMeta.etag === remoteEtag && cachedMeta.size === remoteSize;
        const localSize = fs.existsSync(localzipfile) ? fs.statSync(localzipfile).size : 0;
        const alreadyComplete = sameRemoteVersion && !isNaN(remoteSize) && localSize === remoteSize;

        if (alreadyComplete) {
            console.log('MainFrame Xpublic zaten güncel, yerel kopya kullanılıyor.');
        } else {
            if (!sameRemoteVersion && localSize > 0) {
                fs.unlinkSync(localzipfile);
            }
            fs.writeFileSync(metaFile, JSON.stringify({ etag: remoteEtag, size: remoteSize }));
            await downloadWithRetry(remoteUrl, localzipfile, { totalBytes: remoteSize, resumable: acceptsRanges });
        }
    }

    const zip = new zipper(localzipfile);
    zip.extractAllTo(destiny, true);
    console.log('MainFrame Xpublic is reeady...');
    return destiny;

}
