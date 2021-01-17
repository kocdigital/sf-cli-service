const http = require('http');
const fs = require('fs');
const path = require('path');
const zipper = require('adm-zip');

const getFile = (url, dest) => new Promise((resolve, reject) => {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(() => resolve());
        });
    }).on('error', function (err) {
        console.error(new Error('Main Frame URL could not found. Please make sure .development.env file has the correct MAINFRAME_URL settings.'))
        fs.unlink(dest);
        reject(err)
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
