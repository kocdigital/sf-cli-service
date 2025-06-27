const http = require('https');
const fs = require('fs');
const path = require('path');
const zipper = require('adm-zip');
const { warn, error } = require('@vue/cli-shared-utils');

const getFile = (url, dest) => new Promise((resolve, reject) => {
    const terminalWidth = process.stdout.columns || 80;
    const BASE_DOWNLOAD_MESSAGE = 'Downloading MainFrame Xpublic Zip: 100.00% []';
    const MIN_BAR_LENGTH = 10;
    const percentFormatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    var file = fs.createWriteStream(dest);
    var request = http.get(url, function (response) {
        const contentLength = response.headers['content-length'];
        const totalBytes = contentLength ? parseInt(contentLength, 10) : NaN;
        let downloadedBytes = 0;

        if (isNaN(totalBytes)) {
            warn('Missing or invalid "Content-Length" header. Progress bar will be skipped.');
        }

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
            fs.unlink(dest, () => reject(err));
        });

        file.on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
        file.on('finish', function () {
            file.close(() => resolve());
        });
    }).on('error', function (err) {
        error('Main Frame URL could not be found. Please make sure .development.env file has the correct MAINFRAME_URL settings.');
        error(err);
        fs.unlink(dest);
        reject(err);
    });
});

exports.prapereDevPub = async function (api, pubzipurl) {

    const sfConfig = require(api.resolve('sf.config.js'));

    const localzipfile = path.resolve(__dirname, pubzipurl);
    await getFile(sfConfig.mainFrameUrl + '/' + pubzipurl, localzipfile);
    const zip = new zipper(localzipfile);
    const destiny = path.resolve(__dirname + '/devpub')
    zip.extractAllTo(destiny, true);
    console.log('MainFrame Xpublic is reeady...');
    return destiny;

}
